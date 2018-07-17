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

import {Action} from '../common/actions';
import {dingus} from '../test/dingus';

import {gDispatch} from './globals';
import {quietDispatch} from './mithril_helpers';

// TODO(hjd): Do this in jsdom environment.
afterEach(() => {
  gDispatch.resetForTesting();
});

test('quietDispatch with object', () => {
  const e = new Event('an_event');
  (e as {} as {redraw: boolean}).redraw = true;
  const d = dingus<(action: Action) => void>('dispatch');
  gDispatch.set(d);
  const action = {};
  quietDispatch(action)(e);
  expect((e as {} as {redraw: boolean}).redraw).toBe(false);
  expect(d.calls[0][1][0]).toBe(action);
});

test('quietDispatch with function', () => {
  const e = new Event('an_event');
  (e as {} as {redraw: boolean}).redraw = true;

  const dispatch = dingus<(action: Action) => void>('dispatch');
  gDispatch.set(dispatch);

  const theAction = {};

  const action = (theEvent: Event) => {
    expect(theEvent).toBe(e);
    return theAction;
  };

  quietDispatch(action)(e);
  expect((e as {} as {redraw: boolean}).redraw).toBe(false);
  expect(dispatch.calls[0][1][0]).toBe(theAction);
});
