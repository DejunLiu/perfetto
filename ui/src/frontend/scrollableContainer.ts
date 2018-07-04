/*
 * Copyright (C) 2018 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as m from 'mithril';

const scrollableContent = {
  view({attrs, children}) {
    return m('.scrollableContent',
      {
        style: {
          'will-change': 'transform',
          height: attrs.contentHeight + 'px',
          overflow: 'hidden'
        }
      }, children);
  }
} as m.Comp<{
  onPassiveScroll: (scrollOffset: number) => void,
  contentHeight: number
}, {}>;

export const scrollableContainer = {
  view({attrs, children}) {
    return m('.scrollableContainer',
      {
        style: {
          width: attrs.width + 'px',
          height: attrs.height + 'px',
          overflow: 'auto',
          position: 'relative'
        }
      },
      m(scrollableContent, {
        onPassiveScroll: attrs.onPassiveScroll,
        contentHeight: attrs.contentHeight
      }, children));

  },

  oncreate(vnode) {
    vnode.dom.addEventListener('scroll', _ => {
      vnode.attrs.onPassiveScroll((vnode.dom as any).scrollTop);
      console.log('i scrolled', (vnode.dom as any).scrollTop);
    }, {passive: true})
  }
} as m.Comp<{
  width: number,
  height: number,
  contentHeight: number,
  onPassiveScroll: (scrollTop: number) => void,
}, {}>;
