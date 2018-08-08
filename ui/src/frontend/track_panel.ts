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

import {moveTrack} from '../common/actions';
import {TrackState} from '../common/state';

import {globals} from './globals';
import {drawGridLines} from './gridline_helper';
import {quietDispatch} from './mithril_helpers';
import {Panel} from './panel';
import {Track} from './track';
import {trackRegistry} from './track_registry';

export const TRACK_INFO_WIDTH = 200;

export const TrackShell = {
  view({attrs}) {
    return m(
        '.track-shell',
        m('.track-info',
          {
            style: {
              width: `${TRACK_INFO_WIDTH}px`,
            }
          },
          m('h1', attrs.trackState.name),
          m('.reorder-icons',
            m(TrackMoveButton, {
              direction: 'up',
              trackId: attrs.trackState.id,
              top: 10,
            }),
            m(TrackMoveButton, {
              direction: 'down',
              trackId: attrs.trackState.id,
              top: 40,
            }))));
  },
} as m.Component<{trackState: TrackState}>;

const TrackMoveButton = {
  view({attrs}) {
    return m(
        'i.material-icons',
        {
          onclick: quietDispatch(moveTrack(attrs.trackId, attrs.direction)),
          style: {
            position: 'absolute',
            right: '10px',
            top: `${attrs.top}px`,
            color: '#fff',
            'font-weight': 'bold',
            'text-align': 'center',
            cursor: 'pointer',
            background: '#ced0e7',
            'border-radius': '12px',
            display: 'block',
            width: '24px',
            height: '24px',
            border: 'none',
            outline: 'none',
          }
        },
        attrs.direction === 'up' ? 'arrow_upward_alt' : 'arrow_downward_alt');
  }
} as m.Component<{
  direction: 'up' | 'down',
  trackId: string,
  top: number,
},
                        {}>;

// TODO: Rename this file to track_panel.ts
export class TrackPanel implements Panel {
  private track: Track;
  constructor(public trackState: TrackState) {
    // TODO: Since ES6 modules are asynchronous and it is conceivable that we
    // want to load a track implementation on demand, we should not rely here on
    // the fact that the track is already registered. We should show some
    // default content until a track implementation is found.
    const trackCreator = trackRegistry.get(this.trackState.kind);
    this.track = trackCreator.create(this.trackState);
  }

  updateDom(dom: Element): void {
    // TOOD: Let tracks render DOM in the content area.
    m.render(dom, m(TrackShell, {trackState: this.trackState}));
  }

  renderCanvas(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(TRACK_INFO_WIDTH, 0);
    const {visibleWindowMs} = globals.frontendLocalState;
    drawGridLines(
        ctx,
        globals.frontendLocalState.timeScale,
        [visibleWindowMs.start, visibleWindowMs.end],
        // TODO: Height should be a property of panel.
        this.trackState.height);

    const trackData = globals.trackDataStore.get(this.trackState.id);
    if (trackData !== undefined) this.track.consumeData(trackData);
    this.track.renderCanvas(ctx);

    ctx.restore();
  }
}