// Copyright (C) 2018 The Android Open Source Project
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as m from 'mithril';

import {createEmptyState} from '../common/state';
import {warmupWasmEngineWorker} from '../controller/wasm_engine_proxy';

import {CanvasController} from './canvas_controller';
import {CanvasWrapper} from './canvas_wrapper';
import {ChildVirtualContext} from './child_virtual_context';
import {gState} from './globals';
import {HomePage} from './home_page';
import {createPage} from './pages';
import {ScrollableContainer} from './scrollable_container';
import {Track} from './track';

export const Frontend = {
  oninit() {
    this.width = 1000;
    this.height = 600;
    this.canvasController = new CanvasController(this.width, this.height);
  },
  oncreate(vnode) {
    const rect = vnode.dom.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvasController.setDimensions(this.width, this.height);

    setTimeout(() => m.redraw());

    // Once ResizeObservers are out, we can stop accessing the window here.
    window.addEventListener('resize', () => {
      const rect = vnode.dom.getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;
      this.canvasController.setDimensions(this.width, this.height);
      m.redraw();
    });
  },
  view({}) {
    const canvasTopOffset = this.canvasController.getCanvasTopOffset();
    const ctx = this.canvasController.getContext();

    this.canvasController.clear();

    return m(
        '.frontend',
        {
          style: {
            position: 'relative',
            width: this.width.toString() + 'px',
            height: 'calc(100% - 100px)'
          }
        },
        m(ScrollableContainer,
          {
            width: this.width,
            height: this.height,
            contentHeight: 1000,
            onPassiveScroll: (scrollTop: number) => {
              this.canvasController.updateScrollOffset(scrollTop);
              m.redraw();
            },
          },
          m(CanvasWrapper, {
            topOffset: canvasTopOffset,
            canvasElement: this.canvasController.getCanvasElement()
          }),
          m(Track, {
            name: 'Track 1',
            trackContext: new ChildVirtualContext(
                ctx, {y: 0, x: 0, width: this.width, height: 90}),
            top: 0
          }),
          m(Track, {
            name: 'Track 2',
            trackContext: new ChildVirtualContext(
                ctx, {y: 100, x: 0, width: this.width, height: 90}),
            top: 100
          }),
          m(Track, {
            name: 'Track 3',
            trackContext: new ChildVirtualContext(
                ctx, {y: 200, x: 0, width: this.width, height: 90}),
            top: 200
          }),
          m(Track, {
            name: 'Track 4',
            trackContext: new ChildVirtualContext(
                ctx, {y: 300, x: 0, width: this.width, height: 90}),
            top: 300
          }),
          m(Track, {
            name: 'Track 5',
            trackContext: new ChildVirtualContext(
                ctx, {y: 400, x: 0, width: this.width, height: 90}),
            top: 400
          }),
          m(Track, {
            name: 'Track 6',
            trackContext: new ChildVirtualContext(
                ctx, {y: 500, x: 0, width: this.width, height: 90}),
            top: 500
          }),
          m(Track, {
            name: 'Track 7',
            trackContext: new ChildVirtualContext(
                ctx, {y: 600, x: 0, width: this.width, height: 90}),
            top: 600
          }),
          m(Track, {
            name: 'Track 8',
            trackContext: new ChildVirtualContext(
                ctx, {y: 700, x: 0, width: this.width, height: 90}),
            top: 700
          }),
          m(Track, {
            name: 'Track 9',
            trackContext: new ChildVirtualContext(
                ctx, {y: 800, x: 0, width: this.width, height: 90}),
            top: 800
          }),
          m(Track, {
            name: 'Track 10',
            trackContext: new ChildVirtualContext(
                ctx, {y: 900, x: 0, width: this.width, height: 90}),
            top: 900
          }), ), );
  },
} as
    m.Component<
        {width: number, height: number},
        {canvasController: CanvasController, width: number, height: number}>;

export const FrontendPage = createPage({
  view() {
    return m(Frontend, {width: 1000, height: 300});
  }
});

function createController() {
  const worker = new Worker('controller_bundle.js');
  worker.onerror = e => {
    console.error(e);
  };
}

function main() {
  gState.set(createEmptyState());
  createController();
  warmupWasmEngineWorker();

  const root = document.getElementById('frontend');
  if (!root) {
    console.error('root element not found.');
    return;
  }

  m.route(root, '/', {
    '/': HomePage,
    '/viewer': FrontendPage,
  });
}

main();
