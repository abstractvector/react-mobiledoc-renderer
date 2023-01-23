export type MarkupType = [string, string[]];

export type MobiledocAtomType = [string, string, Record<string, unknown>];

export type MobiledocCardType = [string, Record<string, unknown>];

export type MarkerType =
  | [0, number[], number, string] // text
  | [1, number[], number, number]; // atom

export type SectionMarkupType = [1, string, MarkerType[], string[] | undefined];
export type SectionImageType = [2, string];
export type SectionListType = [3, string, MarkerType[][], string[] | undefined];
export type SectionCardType = [10, number];

export type SectionType =
  | SectionMarkupType
  | SectionImageType
  | SectionCardType
  | [number, string | number, unknown, unknown];

export interface MobiledocInput {
  version?: string;
  markups?: (string | string[])[][];
  atoms?: MobiledocAtomType[];
  cards?: MobiledocCardType[];
  sections?: unknown[][];
}

class MobiledocError extends Error {}

export default class Mobiledoc {
  version: string | undefined;

  markups: MarkupType[];
  atoms: MobiledocAtomType[];
  cards: MobiledocCardType[];
  sections: SectionType[];

  constructor({ version, markups, atoms, cards, sections }: MobiledocInput = {}) {
    this.version = version ?? undefined;

    this.atoms = atoms ?? [];
    this.cards = cards ?? [];
    this.markups = this.#sanitizeMarkups(markups || []);
    this.sections = this.#sanitizeSections(sections ?? []);
  }

  getAtom(index: number | undefined) {
    if (index === undefined || !this.atoms[index]) return undefined;
    return this.atoms[index];
  }

  getCard(index: number | undefined) {
    if (index === undefined || !this.cards[index]) return undefined;
    return this.cards[index];
  }

  getMarkup(index: number | undefined) {
    if (index === undefined || !this.markups[index]) return undefined;
    return this.markups[index];
  }

  #sanitizeMarkups(markups: (string | string[])[][]): MarkupType[] {
    return (markups ?? []).map((markup) => {
      const [tagName, attributes = []] = markup;

      if (typeof tagName !== 'string') {
        throw new MobiledocError(`Expected markup tag name to be a string but received: ${tagName}`);
      }

      if (!Array.isArray(attributes) || !attributes.every((a) => typeof a === 'string')) {
        throw new MobiledocError(`Invalid markup attributes found: ${JSON.stringify(attributes)}`);
      }

      return [tagName, attributes];
    });
  }

  #sanitizeSections(sections: unknown[][]): SectionType[] {
    return (sections ?? []).map((section) => {
      const [sectionTypeIdentifier, ...sectionProps] = section;

      switch (sectionTypeIdentifier) {
        case 1: {
          // Markup (text)
          const [tagName, markers, optionalSectionAttributesArray] = sectionProps;
          if (typeof tagName !== 'string') {
            throw new MobiledocError(`Expected markup section tag name to be a string but received: ${tagName}`);
          }

          return [sectionTypeIdentifier, tagName, this.#sanitizeMarkers(markers), optionalSectionAttributesArray];
        }

        case 2: {
          // Image
          const [src] = sectionProps;
          if (typeof src !== 'string') {
            throw new MobiledocError(`Found image section and expected src but found: ${src}`);
          }
          return [sectionTypeIdentifier, src];
        }

        case 3: {
          // List
          const [tagName, markers, optionalSectionAttributesArray] = sectionProps;
          const allowedListTags = ['ol', 'ul'];
          if (typeof tagName !== 'string' || !allowedListTags.includes(tagName)) {
            throw new MobiledocError(
              `Expected list section tag name to be one of [${allowedListTags.join(',')}] but received: ${tagName}`
            );
          }

          if (!Array.isArray(markers)) {
            throw new MobiledocError(`Expected array of markers for list section but received: ${markers}`);
          }

          return [
            sectionTypeIdentifier,
            tagName,
            markers.map((m) => this.#sanitizeMarkers(m)),
            optionalSectionAttributesArray,
          ];
        }

        case 10: {
          // Card
          const [cardIndex] = sectionProps;

          if (!Number.isInteger(cardIndex) || this.cards[cardIndex as number] === undefined) {
            throw new MobiledocError(`Unrecognized card index: ${cardIndex}`);
          }

          return [sectionTypeIdentifier, cardIndex as number];
        }
      }

      throw new MobiledocError(`Unrecognized section type identifier: ${sectionTypeIdentifier}`);
    });
  }

  #sanitizeMarkers(markers: unknown): MarkerType[] {
    if (markers === undefined) return [];

    if (!Array.isArray(markers)) throw new MobiledocError(`Expected an array of markers but received: ${markers}`);

    return markers.map((marker, ix) => {
      const [textTypeIdentifier, openMarkupsIndexes, numberOfClosedMarkups, value] = marker;

      if (!Array.isArray(openMarkupsIndexes) || !openMarkupsIndexes.every((ix) => Number.isInteger(ix))) {
        throw new MobiledocError(
          `Expected array of open markup indexes but received: ${JSON.stringify(openMarkupsIndexes)}`
        );
      }

      if (!Number.isInteger(numberOfClosedMarkups)) {
        throw new MobiledocError(`Expected number of closed markups but received: ${numberOfClosedMarkups}`);
      }

      switch (textTypeIdentifier) {
        case 0: {
          // text
          if (typeof value !== 'string') {
            throw new MobiledocError(
              `Expected to receive string value for text marker index ${ix} but received: ${value}`
            );
          }
          break;
        }
        case 1: {
          // atom
          if (!Number.isInteger(value)) {
            throw new MobiledocError(
              `Expected to receive integer value for atom marker index ${ix} but received: ${value}`
            );
          }
          break;
        }
        default: {
          throw new MobiledocError(`Unrecognized marker type identifier: ${textTypeIdentifier}`);
        }
      }

      return marker;
    });
  }
}
