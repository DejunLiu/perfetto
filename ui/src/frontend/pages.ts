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

const Nav: m.Component = {
  view() {
    return m(
        'nav',
        m('ul',
          m('li', m('a[href=/]', {oncreate: m.route.link}, 'Home')),
          m('li', m('a[href=/viewer]', {oncreate: m.route.link}, 'Viewer'))));
  }
};

/**
 * Wrap component with common UI elements (nav bar etc).
 */
export function createPage(component: m.Component): m.Component {
  return {
    view() {
      return [
        m(Nav),
        m(component),
      ];
    },
  };
}
