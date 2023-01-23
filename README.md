# Mobiledoc Renderer for React

<p align="center">A Mobiledoc renderer for React written with Typescript</p>

<div align="center">

[![License](https://img.shields.io/github/license/abstractvector/react-mobiledoc-renderer)](https://github.com/abstractvector/react-mobiledoc-renderer/blob/main/LICENSE.md)
[![NPM Version](https://img.shields.io/npm/v/react-mobiledoc-renderer)](https://www.npmjs.com/package/react-mobiledoc-renderer)
[![NPM Downloads](https://img.shields.io/npm/dw/react-mobiledoc-renderer)](https://www.npmjs.com/package/react-mobiledoc-renderer)

</div>

<p align="center">Allows injection of custom React components for greater control over the rendering and uses a plugin-type pattern allowing for easy extension and customization.</p>

<hr />

> **Warning**
> This is pre-production code and still under active development. Use at your own risk.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)

## Installation

Install the module using `npm install`:

```javascript
npm install react-mobiledoc-renderer
```

## Usage

To use the module, simply `import` it into your code and use as follows:

```javascript
import Renderer from 'react-mobiledoc-renderer';

const renderer = new Renderer({
  // ...see below for options
});

const mobiledoc = {
  // mobiledoc document object
};

// note that the .render() method is async
const { result } = await renderer.render();

// the `result` is a React element
return <article>{result}</article>;
```
