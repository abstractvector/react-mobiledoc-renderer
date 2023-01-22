import type Mobiledoc from '../mobiledoc';
import type { SectionType } from '../mobiledoc';

export interface PluginType {
  onRenderSection?: (
    payload: SectionType,
    env: {
      mobiledoc: Mobiledoc;
    }
  ) =>
    | React.DOMElement<React.DOMAttributes<Element>, Element>
    | undefined
    | void
    | Promise<React.DOMElement<React.DOMAttributes<Element>, Element> | undefined | void>;
}

export class PluginError extends Error {}

export default class BasePlugin implements PluginType {}
