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

import {VirtualCanvasContext} from './virtual_canvas_context';

export class RootCanvasContext extends VirtualCanvasContext {
  constructor(
      ctx: CanvasRenderingContext2D|VirtualCanvasContext,
      protected rect:
          {left: number, top: number, width: number, height: number},
      private canvasHeight: number) {
    super(ctx, rect);
  }

  isOnCanvas(rect: {left: number, top: number, width: number, height: number}):
      boolean {
    const topPos = -1 * this.rect.top;
    const botPos = topPos + this.canvasHeight;

    return rect.top >= topPos && rect.top + rect.height <= botPos;
  }

  // TODO: check bounds on draw functions, throw error if outside of canvas.
}
