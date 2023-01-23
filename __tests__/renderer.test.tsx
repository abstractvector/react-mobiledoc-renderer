import React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import { Renderer } from '../src';

describe('Renderer constructor', () => {
  test('Accepts an empty constructor', () => {
    const mobiledoc = new Renderer();

    expect(mobiledoc).toBeInstanceOf(Renderer);

    expect(mobiledoc.atoms).toStrictEqual({});
    expect(mobiledoc.atomOptions).toStrictEqual({});
    expect(mobiledoc.cards).toStrictEqual({});
    expect(mobiledoc.cardOptions).toStrictEqual({});
    expect(mobiledoc.unknownAtomComponent).toBeUndefined();
    expect(mobiledoc.unknownCardComponent).toBeUndefined();
    expect(mobiledoc.plugins).toStrictEqual([]);

    expect(typeof mobiledoc.getAtom).toBe('function');
    expect(typeof mobiledoc.getCard).toBe('function');
    expect(typeof mobiledoc.render).toBe('function');

    expect(mobiledoc.getAtom('')).toBeUndefined();
    expect(mobiledoc.getCard('')).toBeUndefined();

    expect(mobiledoc.options).toStrictEqual({
      errorHandler: undefined,
      suppressErrors: false,
    });
  });
});

describe('Section rendering', () => {
  describe('Markup rendering', () => {
    test('Renders a simple paragraph', async () => {
      const r = new Renderer();
      const promise = r.render({ version: '0.3.2', sections: [[1, 'p', [[0, [], 0, 'Hello world']]]] });

      expect(promise).toBeInstanceOf(Promise);

      const data = await promise;

      expect(typeof data).toBe('object');
      expect(typeof data.result).toBe('object');

      const { result } = data;

      const html = ReactDOMServer.renderToStaticMarkup(result);

      expect(html).toEqual('<p>Hello world</p>');
    });

    test('Renders multiple sections', async () => {
      const { result } = await new Renderer().render({
        version: '0.3.2',
        sections: [
          [1, 'p', [[0, [], 0, 'Hello world']]],
          [1, 'section', [[0, [], 0, 'Hello again']]],
        ],
      });

      expect(ReactDOMServer.renderToStaticMarkup(result)).toEqual('<p>Hello world</p><section>Hello again</section>');
    });

    test('Renders text markups', async () => {
      const { result } = await new Renderer().render({
        version: '0.3.2',
        markups: [['strong'], ['a', ['href', 'https://www.example.com/']]],
        sections: [
          [
            1,
            'p',
            [
              [0, [0], 1, 'This is a: '],
              [0, [1], 1, 'Link'],
            ],
          ],
        ],
      });

      expect(ReactDOMServer.renderToStaticMarkup(result)).toEqual(
        '<p><strong>This is a: </strong><a href="https://www.example.com/">Link</a></p>'
      );
    });

    test('Renders atom markups', async () => {
      const { result } = await new Renderer({
        atoms: {
          mention: ({ env: { name }, payload: { id }, children }) => {
            return (
              <span className={name} id={id}>
                {children}
              </span>
            );
          },
        },
      }).render({
        version: '0.3.2',
        atoms: [['mention', '@alice', { id: 12 }]],
        sections: [[1, 'p', [[1, [], 0, 0]]]],
      });

      expect(ReactDOMServer.renderToStaticMarkup(result)).toEqual('<p><span class="mention" id="12">@alice</span></p>');
    });
  });

  describe('Image rendering', () => {
    test('Renders an image section', async () => {
      const { result } = await new Renderer().render({
        version: '0.3.2',
        sections: [[2, '/path/to/image.jpeg']],
      });

      expect(ReactDOMServer.renderToStaticMarkup(result)).toEqual('<img src="/path/to/image.jpeg"/>');
    });
  });

  describe('List rendering', () => {
    test('Renders a list section', async () => {
      const { result } = await new Renderer().render({
        version: '0.3.2',
        sections: [
          [
            3,
            'ul',
            [
              [0, [], 0, 'List item 1'],
              [0, [], 0, 'List item 2'],
            ],
          ],
          [
            3,
            'ol',
            [
              [0, [], 0, 'List item 1'],
              [0, [], 0, 'List item 2'],
            ],
          ],
        ],
      });

      expect(ReactDOMServer.renderToStaticMarkup(result)).toEqual(
        '<ul><li>List item 1</li><li>List item 2</li></ul><ol><li>List item 1</li><li>List item 2</li></ol>'
      );
    });
  });

  describe('Card rendering', () => {
    test('Throws an error if no unknown card component is specified but unknown card is found', async () => {
      await expect(async () => {
        await new Renderer().render({
          version: '0.3.2',
          sections: [[10, 0]],
          cards: [['my-card', { key: 'value' }]],
        });
      }).rejects.toThrowError();
    });

    test('Renders an unknown card component', async () => {
      const { result } = await new Renderer({
        unknownCardComponent: ({ env: { name }, payload: { key } }) => {
          return (
            <div className="unknown-card" x-key={key}>
              {name}
            </div>
          );
        },
      }).render({
        version: '0.3.2',
        sections: [[10, 0]],
        cards: [['my-card', { key: 'value' }]],
      });

      expect(ReactDOMServer.renderToStaticMarkup(result)).toEqual(
        '<div class="unknown-card" x-key="value">my-card</div>'
      );
    });

    test('Renders an unknown card component', async () => {
      const { result } = await new Renderer({
        cards: {
          myCard: ({ env: { name }, payload: { key } }) => {
            return (
              <div className="my-card" x-key={key}>
                {name}
              </div>
            );
          },
        },
      }).render({
        version: '0.3.2',
        sections: [[10, 0]],
        cards: [['myCard', { key: 'value' }]],
      });

      expect(ReactDOMServer.renderToStaticMarkup(result)).toEqual('<div class="my-card" x-key="value">myCard</div>');
    });

    test('Throws an error if card index is not found', async () => {
      await expect(async () => {
        await new Renderer().render({
          version: '0.3.2',
          sections: [[10, 1]],
          cards: [['myCard', { key: 'value' }]],
        });
      }).rejects.toThrowError();
    });
  });

  test('Throws an error if an unknown section type is rendered', async () => {
    await expect(async () => {
      await new Renderer().render({
        version: '0.3.2',
        sections: [[99, 0]],
      });
    }).rejects.toThrowError();
  });
});
