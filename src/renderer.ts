import { createElement, Fragment } from 'react';

import { attributeArrayToReactProps } from './utils';

import Mobiledoc, {
  type MarkerType,
  type MarkupType,
  type SectionType,
  type SectionCardType,
  type SectionListType,
  type SectionMarkupType,
  type SectionImageType,
} from './mobiledoc';
import type { PluginType } from './plugins/base';

export interface AtomRenderEnvType {
  name: string;
  onTeardown?: () => void;
  save: ({ newValue, newPayload }: { newValue: string; newPayload: Record<string, unknown> }) => void;
  [key: string]: unknown;
}

export type AtomRenderType = ({
  env,
  options,
  payload,
  value,
}: {
  env: AtomRenderEnvType;
  options: Record<string, unknown>;
  payload: Record<string, unknown>;
  value: string;
}) =>
  | React.DOMElement<React.DOMAttributes<Element>, Element>
  | React.FunctionComponentElement<{ children?: React.ReactNode }>
  | undefined;

export interface AtomType {
  name: string;
  type?: string;
  render: AtomRenderType;
}

export interface CardRenderEnvType {
  isInEditor: boolean;
  name: string;
  onTeardown?: () => void;
  didRender?: () => void;
  [key: string]: unknown;
}

export type CardRenderType = ({
  env,
  options,
  payload,
}: {
  env: CardRenderEnvType;
  options: Record<string, unknown>;
  payload: Record<string, unknown>;
}) => React.DOMElement<React.DOMAttributes<Element>, Element> | undefined;

export interface CardType {
  name: string;
  type?: string;
  render: CardRenderType;
  edit?: CardRenderType;
}

export interface RendererInput {
  atoms?: AtomType[];
  atomOptions?: Record<string, unknown>;
  cards?: CardType[];
  cardOptions?: Record<string, unknown>;
  unknownAtomHandler?: AtomRenderType;
  unknownCardHandler?: CardRenderType;
  plugins?: PluginType[];
}

export interface RendererOptions {
  errorHandler: ((message: string) => void) | undefined;
  suppressErrors: boolean;
}

class RendererError extends Error {}

export default class Renderer {
  atoms: AtomType[];
  atomOptions: Record<string, unknown>;

  cards: CardType[];
  cardOptions: Record<string, unknown>;

  unknownAtomHandler: AtomRenderType | undefined;
  unknownCardHandler: CardRenderType | undefined;

  options: RendererOptions = {
    errorHandler: undefined,
    suppressErrors: false,
  };

  plugins: PluginType[];

  constructor({
    atoms,
    atomOptions,
    cards,
    cardOptions,
    unknownAtomHandler,
    unknownCardHandler,
    plugins,
  }: RendererInput = {}) {
    this.atoms = atoms ?? [];
    this.atomOptions = atomOptions ?? {};

    this.cards = cards ?? [];
    this.cardOptions = cardOptions ?? {};

    this.unknownAtomHandler = unknownAtomHandler;
    this.unknownCardHandler = unknownCardHandler;

    this.plugins = plugins ?? [];
  }

  getAtom(atomName: string) {
    return this.atoms?.find((atom) => atom.name === atomName);
  }

  getCard(cardName: string) {
    return this.cards?.find((card) => card.name === cardName);
  }

  #error(message: string): true {
    if (this.options['suppressErrors']) {
      if (typeof this.options['errorHandler'] === 'function') this.options['errorHandler'](message);
      return true;
    }

    throw new RendererError(message);
  }

  async #runPlugins(method: 'onRenderSection', payload: SectionType, { mobiledoc }: { mobiledoc: Mobiledoc }) {
    for (const plugin of this.plugins) {
      const pluginMethod = (plugin as Record<string, unknown>)[method];

      if (typeof pluginMethod !== 'function') {
        this.#error(`Plugin provided non-function method for: ${method}`);
        continue;
      }

      switch (method) {
        case 'onRenderSection': {
          if (typeof plugin.onRenderSection !== 'function') break;
          const result = await plugin.onRenderSection(payload, { mobiledoc });
          if (result !== undefined) return result;
          break;
        }
        default: {
          this.#error(`Attempted to call an unrecognized plugin method: ${method}`);
        }
      }
    }
    return;
  }

  async render(_mobiledoc: Mobiledoc | object): Promise<{
    result: React.FunctionComponentElement<{ children?: React.ReactNode }>;
    teardown: () => void;
  }> {
    const mobiledoc = _mobiledoc instanceof Mobiledoc ? _mobiledoc : new Mobiledoc(_mobiledoc);

    const sectionElements = await Promise.all(
      mobiledoc.sections.map((section) => this.#renderSection({ section, mobiledoc }))
    );

    const result = createElement(Fragment, { children: sectionElements });

    return {
      result,
      teardown: () => {
        this.#error('Teardown is not supported by this renderer');
      },
    };
  }

  async #renderSection({
    section,
    mobiledoc,
  }: {
    section: SectionType;
    mobiledoc: Mobiledoc;
  }): Promise<React.DOMElement<React.DOMAttributes<Element>, Element> | undefined> {
    const [sectionTypeIdentifier] = section;

    const output = await this.#runPlugins('onRenderSection', section, { mobiledoc });
    if (output !== undefined) {
      return output;
    }

    switch (sectionTypeIdentifier) {
      case 1: {
        // Markup (text)
        const [, tagName, markers, optionalSectionAttributesArray] = section as SectionMarkupType;
        const element = createElement(tagName, {
          children: markers.map((marker) => this.#renderMarker({ marker, mobiledoc })),
          ...attributeArrayToReactProps(optionalSectionAttributesArray),
        });
        return element;
      }

      case 2: {
        // Image
        const [, src] = section as SectionImageType;
        const element = createElement('img', { children: undefined, src });
        return element;
      }

      case 3: {
        // List
        const [, tagName, listItems, optionalSectionAttributesArray] = section as SectionListType;
        const element = createElement(tagName, {
          children: listItems.map((markers) => {
            return createElement('li', {
              children: markers.map((marker) => this.#renderMarker({ marker, mobiledoc })),
            });
          }),
          ...attributeArrayToReactProps(optionalSectionAttributesArray),
        });
        return element;
      }

      case 10: {
        // Card
        const [, cardIndex] = section as SectionCardType;
        const cardDefinition = mobiledoc.getCard(cardIndex);

        if (cardDefinition === undefined) {
          this.#error(`Could not locate card with index: ${cardIndex}`);
          return undefined;
        }

        const [cardName, cardPayload] = cardDefinition;
        const card = this.getCard(cardName);

        const render = card?.render ?? this.unknownCardHandler;

        if (render === undefined) {
          this.#error(`No card handler specified for: ${cardName}`);
          return undefined;
        }

        return render({ env: { name: cardName, isInEditor: false }, options: this.cardOptions, payload: cardPayload });
      }
    }

    this.#error(`Could not parse unrecognized section type: ${sectionTypeIdentifier}`);

    return undefined;
  }

  #renderMarker({
    marker,
    mobiledoc,
  }: {
    marker: MarkerType;
    mobiledoc: Mobiledoc;
  }):
    | React.DOMElement<React.DOMAttributes<Element>, Element>
    | React.FunctionComponentElement<{ children?: React.ReactNode }>
    | undefined {
    const [textTypeIdentifier, openMarkupsIndexes, , value] = marker;

    switch (textTypeIdentifier) {
      case 0: {
        // text
        if (openMarkupsIndexes.length > 0) {
          // @todo handle multiple openMarkupsIndexes
          const markup = mobiledoc.getMarkup(openMarkupsIndexes[0]);
          if (markup === undefined) {
            this.#error(`Invalid markup reference: ${openMarkupsIndexes[0]}`);
            return undefined;
          }
          return this.#renderMarkup({ markup, value });
        } else {
          return createElement(Fragment, { children: value });
        }
      }
      case 1: {
        // atom
        // @todo handle multiple openMarkupsIndexes
        const atomDefinition = mobiledoc.getAtom(value);

        if (atomDefinition === undefined) {
          this.#error(`Could not locate atom with index: ${value}`);
          return undefined;
        }

        const [atomName, atomText, atomPayload] = atomDefinition;
        const atom = this.getAtom(atomName);

        const render = atom?.render ?? this.unknownAtomHandler;

        if (render === undefined) {
          this.#error(`No atom handler specified for: ${atomName}`);
          return undefined;
        }

        const env: AtomRenderEnvType = {
          name: atomName,
          save: ({ newValue, newPayload }) => {
            return render({ env, options: this.atomOptions, payload: newPayload, value: newValue });
          },
        };

        return render({ env, options: this.atomOptions, payload: atomPayload, value: atomText });
      }
    }
  }

  #renderMarkup({
    markup: [tagName, attributeArray],
    value,
  }: {
    markup: MarkupType;
    value: string;
  }): React.DOMElement<React.DOMAttributes<Element>, Element> {
    // @todo add support for custom markup renderers

    return createElement(tagName, { children: value, ...attributeArrayToReactProps(attributeArray) });
  }
}
