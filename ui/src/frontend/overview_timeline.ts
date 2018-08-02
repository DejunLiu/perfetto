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

import {TimeAxis} from './time_axis';
import {TimeScale} from './time_scale';

/**
 * Overview timeline with a brush for time-based selections.
 */
export const OverviewTimeline = {
  oninit() {
    this.timeScale = new TimeScale([0, 1], [0, 0]);
    this.padding = {top: 0, right: 20, bottom: 0, left: 20};
  },
  oncreate(vnode) {
    const rect = vnode.dom.getBoundingClientRect();
    this.width = rect.width;

    this.timeScale.setLimitsPx(
        this.padding.left, this.width - this.padding.left - this.padding.right);
  },
  onupdate(vnode) {
    const rect = vnode.dom.getBoundingClientRect();
    this.width = rect.width;

    this.timeScale.setLimitsPx(
        this.padding.left, this.width - this.padding.left - this.padding.right);
  },
  view({attrs}) {
    this.timeScale.setLimitsMs(
        attrs.maxVisibleWindowMs.start, attrs.maxVisibleWindowMs.end);

    return m(
        '.overview-timeline',
        m(TimeAxis, {
          timeScale: this.timeScale,
          contentOffset: 0,
          visibleWindowMs: attrs.maxVisibleWindowMs,
        }),
        m('.visualization', {
          style: {
            width: '100%',
            height: '100%',
          }
        }),
        m('.brushes',
          {
            style: {
              position: 'absolute',
              left: `${this.padding.left}px`,
              top: '41px',
              width: 'calc(100% - 40px)',
              height: 'calc(100% - 41px)',
            }
          },
          m(HorizontalBrushSelection, {
            onBrushedPx: (startPx: number, endPx: number) => {
              attrs.onBrushedMs(
                  this.timeScale.pxToMs(startPx), this.timeScale.pxToMs(endPx));
            },
            selectionPx: {
              start: this.timeScale.msToPx(attrs.visibleWindowMs.start),
              end: this.timeScale.msToPx(attrs.visibleWindowMs.end)
            },
          })));
  },
} as
    m.Component<
        {
          visibleWindowMs: {start: number, end: number},
          maxVisibleWindowMs: {start: number, end: number},
          onBrushedMs: (start: number, end: number) => void,
        },
        {
          width: number,
          timeScale: TimeScale,
          padding: {top: number, right: number, bottom: number, left: number},
        }>;

/**
 * Interactive horizontal brush for pixel-based selections.
 */
const HorizontalBrushSelection = {
  oninit() {
    let dragState: 'draggingStartHandle'|'draggingEndHandle'|'notDragging' =
        'notDragging';

    this.rightHandleMouseDownListener = () => {
      dragState = 'draggingEndHandle';
    };
    this.leftHandleMouseDownListener = () => {
      dragState = 'draggingStartHandle';
    };
    this.mouseDownListener = (e: MouseEvent) => {
      const posX = e.clientX - this.offsetLeft;
      dragState = 'draggingEndHandle';
      this.onBrushedPx(posX, posX + 1);
    };
    this.mouseMoveListener = (e: MouseEvent) => {
      if (dragState === 'notDragging') {
        return;
      }
      // Prevent text selections
      e.preventDefault();

      const posX = e.clientX - this.offsetLeft;
      if ((dragState === 'draggingEndHandle' &&
           posX < this.selectionPx.start) ||
          (dragState === 'draggingStartHandle' &&
           posX > this.selectionPx.end)) {
        // Flip start and end if handle has been dragged past the other limit.
        dragState = dragState === 'draggingStartHandle' ? 'draggingEndHandle' :
                                                          'draggingStartHandle';
      }
      if (dragState === 'draggingStartHandle') {
        this.onBrushedPx(posX, this.selectionPx.end);
      } else {
        this.onBrushedPx(this.selectionPx.start, posX);
      }
    };
    this.mouseUpListener = () => {
      dragState = 'notDragging';
    };
  },
  oncreate(vnode) {
    document.body.addEventListener('mousemove', this.mouseMoveListener);
    document.body.addEventListener('mouseup', this.mouseUpListener);

    const el = vnode.dom as HTMLElement;
    this.offsetLeft = (el.getBoundingClientRect() as DOMRect).x;
  },
  onupdate(vnode) {
    const el = vnode.dom as HTMLElement;
    this.offsetLeft = (el.getBoundingClientRect() as DOMRect).x;
  },
  onremove() {
    document.body.removeEventListener('mousemove', this.mouseMoveListener);
    document.body.removeEventListener('mouseup', this.mouseUpListener);
  },
  view({attrs}) {
    this.onBrushedPx = attrs.onBrushedPx;
    this.selectionPx = attrs.selectionPx;

    return m(
        '.brushes',
        {
          onmousedown: this.mouseDownListener.bind(this),
          style: {
            width: '100%',
            height: '100%',
          }
        },
        m('.brush-left.brush-rect', {
          style: {
            'border-right': '1px solid #aaa',
            left: '0',
            width: `${attrs.selectionPx.start}px`,
          }
        }),
        m('.brush-right.brush-rect', {
          style: {
            'border-left': '1px solid #aaa',
            left: `${attrs.selectionPx.end}px`,
            width: `calc(100% - ${attrs.selectionPx.end}px)`,
          }
        }),
        m(BrushHandle, {
          left: attrs.selectionPx.start,
          onMouseDown: this.leftHandleMouseDownListener
        }),
        m(BrushHandle, {
          left: attrs.selectionPx.end,
          onMouseDown: this.rightHandleMouseDownListener
        }));
  }
} as
    m.Component<
        {
          onBrushedPx: (start: number, end: number) => void,
          selectionPx: {start: number, end: number},
        },
        {
          rightHandleMouseDownListener: (e: MouseEvent) => void,
          leftHandleMouseDownListener: (e: MouseEvent) => void,
          mouseDownListener: (e: MouseEvent) => void,
          mouseMoveListener: (e: MouseEvent) => void,
          mouseUpListener: () => void,
          selectionPx: {start: number, end: number},
          onBrushedPx: (start: number, end: number) => void,
          offsetLeft: number
        }>;

/**
 * Creates a visual handle with three horizontal bars.
 */
const BrushHandle = {
  view({attrs}) {
    const handleBar = m('.handle-bar', {
      style: {
        height: '5px',
        width: '8px',
        'margin-left': '2px',
        'border-top': '1px solid #888',
      }
    });

    return m(
        '.brush-handle',
        {
          onmousedown: attrs.onMouseDown,
          style: {
            left: `${attrs.left - 6}px`,
          }
        },
        m('.handle-bars',
          {
            style: {
              position: 'relative',
              top: '9px',
            }
          },
          handleBar,
          handleBar,
          handleBar));
  }
} as m.Component<{
  left: number,
  onMouseDown: (e: MouseEvent) => void,
},
                    {}>;