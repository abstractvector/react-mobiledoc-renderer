/* eslint-disable @typescript-eslint/no-explicit-any */
import type React from 'react';

import type Mobiledoc from '../mobiledoc';
import type { SectionType } from '../mobiledoc';

export interface PluginType {
  onRenderMarkup?: (
    payload: {
      tagName: string;
      attributes: Record<string, string>;
      value: string;
    },
    env: {
      mobiledoc: Mobiledoc;
    }
  ) =>
    | React.Component
    | React.FunctionComponent<{ children: React.ReactNode }>
    | Promise<React.Component | React.FunctionComponent<{ children: React.ReactNode }> | undefined>;

  onRenderSection?: (
    payload: SectionType,
    env: {
      mobiledoc: Mobiledoc;
    }
  ) =>
    | React.Component
    | React.FunctionComponent<{ children: React.ReactNode }>
    | Promise<React.Component | React.FunctionComponent<{ children: React.ReactNode }> | any | undefined>;
}

export class PluginError extends Error {}

export default class BasePlugin implements PluginType {}
