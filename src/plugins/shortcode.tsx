/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import ShortcodeParser from '@elderjs/shortcodes';

import type { SectionType } from '../mobiledoc';
import BasePlugin from './base';

export type UnknownShortcodeHandlerType = (shortcode: string) => void;

export interface ShortcodePluginInput {
  shortcodes?: Record<string, React.Component | React.FunctionComponent<any>>;

  unknownShortcodeHandler?: UnknownShortcodeHandlerType;
}

export default class ShortcodePlugin extends BasePlugin {
  #parser = ShortcodeParser();

  #shortcodes: Record<string, React.Component | React.FunctionComponent<any>> = {};
  #unknownShortcodeHandler: UnknownShortcodeHandlerType | undefined;

  constructor({ shortcodes = {}, unknownShortcodeHandler }: ShortcodePluginInput) {
    super();

    this.#unknownShortcodeHandler = unknownShortcodeHandler;

    this.#addShortcodes(shortcodes);
  }

  #addShortcodes(shortcodes: Record<string, React.Component | React.FunctionComponent<any>>) {
    Object.entries(shortcodes).forEach(([shortcode, renderer]) => {
      this.#shortcodes[shortcode] = renderer;
      this.#parser.add(shortcode, (props: Record<string, string>, value?: string) => {
        // the module used for parsing shortcodes can only return a string here
        return JSON.stringify({ shortcode, props: { ...props, children: value } });
      });
    });
  }

  async onRenderSection(payload: SectionType) {
    const [sectionTypeIdentifier, tagName, markers] = payload;

    if (sectionTypeIdentifier === 1 && tagName === 'p' && Array.isArray(markers) && markers.length === 1) {
      const [textTypeIdentifier, openMarkupsIndexes, numberOfClosedMarkups, value] = markers[0];
      if (
        textTypeIdentifier === 0 &&
        Array.isArray(openMarkupsIndexes) &&
        openMarkupsIndexes.length === 0 &&
        numberOfClosedMarkups === 0 &&
        typeof value === 'string'
      ) {
        const outputStr = (await this.#parser.parse(value)) as string;

        // nothing has changed so the parser did nothing
        if (value === outputStr) return;

        let output;
        try {
          output = JSON.parse(outputStr);
        } catch (err) {
          // the parser.output() function returns a string (albeit not valid JSON) if there's a SyntaxError so we must ignore it
          if (!(err instanceof SyntaxError)) throw err;
        }

        if (output === undefined) {
          if (typeof this.#unknownShortcodeHandler === 'function') {
            this.#unknownShortcodeHandler(value);
          }
          return;
        }

        const { shortcode, props } = output;
        const Shortcode = this.#shortcodes[shortcode];

        return typeof Shortcode === 'function' ? <Shortcode $shortcode={shortcode} {...props} /> : undefined;
      }
    }

    return;
  }
}
