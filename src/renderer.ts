/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

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

export interface RendererInput {
  atoms?: Record<string, React.FunctionComponent<any>>;
  atomOptions?: Record<string, unknown>;
  cards?: Record<string, React.FunctionComponent<any>>;
  cardOptions?: Record<string, unknown>;
  unknownAtomComponent?: React.FunctionComponent<any>;
  unknownCardComponent?: React.FunctionComponent<any>;
  plugins?: PluginType[];
}

export interface RendererOptions {
  errorHandler: ((message: string) => void) | undefined;
  suppressErrors: boolean;
}

class RendererError extends Error {}

export default class Renderer {
  atoms: Record<string, React.FunctionComponent<any>>;
  atomOptions: Record<string, unknown>;

  cards: Record<string, React.FunctionComponent<any>>;
  cardOptions: Record<string, unknown>;

  unknownAtomComponent: React.FunctionComponent<any> | undefined;
  unknownCardComponent: React.FunctionComponent<any> | undefined;

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
    unknownAtomComponent,
    unknownCardComponent,
    plugins,
  }: RendererInput = {}) {
    this.atoms = atoms ?? {};
    this.atomOptions = atomOptions ?? {};

    this.cards = cards ?? {};
    this.cardOptions = cardOptions ?? {};

    this.unknownAtomComponent = unknownAtomComponent;
    this.unknownCardComponent = unknownCardComponent;

    this.plugins = plugins ?? [];
  }

  getAtom(atomName: string) {
    return this.atoms[atomName];
  }

  getCard(cardName: string) {
    return this.cards[cardName];
  }

  #error(message: string): undefined {
    if (this.options['suppressErrors']) {
      if (typeof this.options['errorHandler'] === 'function') this.options['errorHandler'](message);
      return undefined;
    }

    throw new RendererError(message);
  }

  async #runPlugins(
    method: string,
    payload: unknown,
    { mobiledoc }: { mobiledoc: Mobiledoc }
  ): Promise<React.FunctionComponent<{ children: React.ReactNode }> | React.Component | React.ReactNode | undefined> {
    for (const plugin of this.plugins) {
      const pluginMethod = (plugin as Record<string, unknown>)[method];

      if (pluginMethod === undefined) continue;

      if (typeof pluginMethod !== 'function') {
        this.#error(`Plugin provided non-function method for: ${method}`);
        continue;
      }

      switch (method) {
        case 'onRenderMarkup': {
          if (typeof plugin.onRenderMarkup !== 'function') break;

          const result = await plugin.onRenderMarkup(
            payload as { tagName: string; attributes: Record<string, string>; value: string },
            { mobiledoc }
          );

          if (typeof result === 'function') return result;

          break;
        }

        case 'onRenderSection': {
          if (typeof plugin.onRenderSection !== 'function') break;

          const result = await plugin.onRenderSection(payload as SectionType, { mobiledoc });

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
    result: React.ReactElement;
  }> {
    const mobiledoc = _mobiledoc instanceof Mobiledoc ? _mobiledoc : new Mobiledoc(_mobiledoc);

    const sectionElements = await Promise.all(
      mobiledoc.sections.map((section) => this.#renderSection({ section, mobiledoc }))
    );

    const result = React.createElement(React.Fragment, { children: sectionElements });

    return { result };
  }

  async #renderSection({
    section,
    mobiledoc,
  }: {
    section: SectionType;
    mobiledoc: Mobiledoc;
  }): Promise<React.ReactElement | undefined> {
    const [sectionTypeIdentifier] = section;

    const output = await this.#runPlugins('onRenderSection', section, { mobiledoc });
    let customTag;
    if (typeof output === 'object') {
      return output as React.ReactElement;
    } else if (typeof output === 'function') {
      customTag = output;
    }

    switch (sectionTypeIdentifier) {
      case 1: {
        // Markup (text)
        const [, tagName, markers, optionalSectionAttributesArray] = section as SectionMarkupType;
        const element = React.createElement(customTag ?? tagName, {
          children: await Promise.all(
            markers.map(async (marker, key) => await this.#renderMarker({ marker, key, mobiledoc }))
          ),
          ...attributeArrayToReactProps(optionalSectionAttributesArray),
        });
        return element;
      }

      case 2: {
        // Image
        const [, src] = section as SectionImageType;
        const element = React.createElement('img', { children: undefined, src });
        return element;
      }

      case 3: {
        // List
        const [, tagName, listItems, optionalSectionAttributesArray] = section as SectionListType;
        const element = React.createElement(tagName, {
          children: await Promise.all(
            listItems.map(async (li, key) => {
              return React.createElement('li', { children: await this.#renderMarker({ marker: li, key, mobiledoc }) });
            })
          ),
          ...attributeArrayToReactProps(optionalSectionAttributesArray),
        });
        return element;
      }

      case 10: {
        // Card
        const [, cardIndex] = section as SectionCardType;
        const cardDefinition = mobiledoc.getCard(cardIndex);

        if (cardDefinition === undefined) {
          return this.#error(`Could not locate card with index: ${cardIndex}`);
        }

        const [cardName, cardPayload] = cardDefinition;

        const card = this.getCard(cardName) ?? this.unknownCardComponent;

        if (card === undefined) {
          return this.#error(`No card handler specified for: ${cardName}`);
        }

        return React.createElement(card, {
          env: { name: cardName },
          options: this.cardOptions,
          payload: cardPayload,
        });
      }
    }

    return this.#error(`Could not parse unrecognized section type: ${sectionTypeIdentifier}`);
  }

  async #renderMarker({
    marker,
    key,
    mobiledoc,
  }: {
    marker: MarkerType;
    key: string | number;
    mobiledoc: Mobiledoc;
  }): Promise<React.ReactNode | undefined> {
    const [textTypeIdentifier, openMarkupsIndexes, , value] = marker;

    switch (textTypeIdentifier) {
      case 0: {
        // text
        if (openMarkupsIndexes.length > 0) {
          // @todo handle multiple openMarkupsIndexes
          const markup = mobiledoc.getMarkup(openMarkupsIndexes[0]);
          if (markup === undefined) {
            return this.#error(`Invalid markup reference: ${openMarkupsIndexes[0]}`);
          }
          return await this.#renderMarkup({ markup, value, mobiledoc });
        } else {
          return React.createElement(React.Fragment, { children: value, key });
        }
      }
      case 1: {
        // atom
        // @todo handle multiple openMarkupsIndexes
        const atomDefinition = mobiledoc.getAtom(value);

        if (atomDefinition === undefined) {
          return this.#error(`Could not locate atom with index: ${value}`);
        }

        const [atomName, atomText, atomPayload] = atomDefinition;

        const atom = this.getAtom(atomName) ?? this.unknownAtomComponent;

        if (atom === undefined) {
          return this.#error(`No atom handler specified for: ${atomName}`);
        }

        return React.createElement(atom, {
          env: { name: atomName },
          options: this.atomOptions,
          payload: atomPayload,
          children: atomText,
        });
      }
    }
  }

  async #renderMarkup({
    markup,
    value,
    mobiledoc,
  }: {
    markup: MarkupType;
    value: string;
    mobiledoc: Mobiledoc;
  }): Promise<React.ReactElement | undefined> {
    const [tagName, attributeArray] = markup;
    const attributes = attributeArrayToReactProps(attributeArray);

    const output = await this.#runPlugins('onRenderMarkup', { tagName, attributes, value }, { mobiledoc });
    let customTag;
    if (typeof output === 'function') {
      customTag = output;
    }

    return React.createElement(customTag ?? tagName, { children: value, ...attributes });
  }
}
