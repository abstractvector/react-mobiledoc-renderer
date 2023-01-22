/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SectionType } from '../mobiledoc';
import BasePlugin from './base';

export interface CustomComponentPluginInput {
  markups?: Record<string, React.Component | React.FunctionComponent<any>>;
  sections?: Record<string, React.Component | React.FunctionComponent<any>>;
}

export default class CustomComponentPlugin extends BasePlugin {
  #markups: Record<string, React.Component | React.FunctionComponent<any>>;
  #sections: Record<string, React.Component | React.FunctionComponent<any>>;

  constructor({ markups = {}, sections = {} }: CustomComponentPluginInput) {
    super();

    this.#markups = markups;
    this.#sections = sections;
  }

  async onRenderMarkup(payload: { tagName: string; attributes: Record<string, string>; value: string }) {
    const { tagName } = payload;

    return this.#markups[tagName];
  }

  async onRenderSection(payload: SectionType) {
    // only want to handle Markup section types
    if (payload[0] !== 1) return;

    const [, tagName] = payload;

    return this.#sections[tagName];
  }
}
