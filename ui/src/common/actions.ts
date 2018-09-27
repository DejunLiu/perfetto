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

import {createEmptyState, defaultTraceTime, State} from './state';
import {TimeSpan} from './time';

export interface Action { type: string; }

export function openTraceFromUrl(url: string) {
  return {
    type: 'OPEN_TRACE_FROM_URL',
    url,
  };
}

export function openTraceFromFile(file: File) {
  return {
    type: 'OPEN_TRACE_FROM_FILE',
    file,
  };
}

// TODO(hjd): Remove CPU and add a generic way to handle track specific state.
export function addTrack(
    engineId: string, trackKind: string, name: string, config: {}) {
  return {
    type: 'ADD_TRACK',
    engineId,
    trackKind,
    name,
    config,
  };
}

export function requestTrackData(
    trackId: string, start: number, end: number, resolution: number) {
  return {type: 'REQ_TRACK_DATA', trackId, start, end, resolution};
}

export function clearTrackDataRequest(trackId: string) {
  return {type: 'CLEAR_TRACK_DATA_REQ', trackId};
}

export function executeQuery(engineId: string, queryId: string, query: string) {
  return {
    type: 'EXECUTE_QUERY',
    engineId,
    queryId,
    query,
  };
}

export function deleteQuery(queryId: string) {
  return {
    type: 'DELETE_QUERY',
    queryId,
  };
}

export function navigate(route: string) {
  return {
    type: 'NAVIGATE',
    route,
  };
}

export function moveTrack(trackId: string, direction: 'up'|'down') {
  return {
    type: 'MOVE_TRACK',
    trackId,
    direction,
  };
}

export function toggleTrackPinned(trackId: string) {
  return {
    type: 'TOGGLE_TRACK_PINNED',
    trackId,
  };
}

export function setEngineReady(engineId: string, ready = true) {
  return {type: 'SET_ENGINE_READY', engineId, ready};
}

export function createPermalink() {
  return {type: 'CREATE_PERMALINK', requestId: new Date().toISOString()};
}

export function setPermalink(requestId: string, hash: string) {
  return {type: 'SET_PERMALINK', requestId, hash};
}

export function loadPermalink(hash: string) {
  return {type: 'LOAD_PERMALINK', requestId: new Date().toISOString(), hash};
}

export function setState(newState: State) {
  return {
    type: 'SET_STATE',
    newState,
  };
}

export function setTraceTime(ts: TimeSpan) {
  return {
    type: 'SET_TRACE_TIME',
    startSec: ts.start,
    endSec: ts.end,
    lastUpdate: Date.now() / 1000,
  };
}

export function setVisibleTraceTime(ts: TimeSpan) {
  return {
    type: 'SET_VISIBLE_TRACE_TIME',
    startSec: ts.start,
    endSec: ts.end,
    lastUpdate: Date.now() / 1000,
  };
}

export function updateStatus(msg: string) {
  return {type: 'UPDATE_STATUS', msg, timestamp: Date.now() / 1000};
}

// TODO(hjd): Type check this better.
// tslint:disable-next-line no-any
export function rootReducer(state: State, action: any): State {
  switch (action.type) {
    case 'NAVIGATE': {
      const nextState = {...state};
      nextState.route = action.route;
      return nextState;
    }

    case 'OPEN_TRACE_FROM_FILE': {
      const nextState = {...state};
      nextState.traceTime = {...defaultTraceTime};
      nextState.visibleTraceTime = {...defaultTraceTime};
      const id = `${nextState.nextId++}`;
      // Reset displayed tracks.
      nextState.pinnedTracks = [];
      nextState.scrollingTracks = [];
      nextState.engines[id] = {
        id,
        ready: false,
        source: action.file,
      };
      nextState.route = `/viewer`;

      return nextState;
    }

    case 'OPEN_TRACE_FROM_URL': {
      const nextState = {...state};
      nextState.traceTime = {...defaultTraceTime};
      nextState.visibleTraceTime = {...defaultTraceTime};
      const id = `${nextState.nextId++}`;
      // Reset displayed tracks.
      nextState.pinnedTracks = [];
      nextState.scrollingTracks = [];
      nextState.engines[id] = {
        id,
        ready: false,
        source: action.url,
      };
      nextState.route = `/viewer`;
      return nextState;
    }

    case 'ADD_TRACK': {
      const nextState = {...state};
      nextState.tracks = {...state.tracks};
      nextState.scrollingTracks = [...state.scrollingTracks];
      const id = `${nextState.nextId++}`;
      nextState.tracks[id] = {
        id,
        engineId: action.engineId,
        kind: action.trackKind,
        name: action.name,
        config: action.config,
      };
      nextState.scrollingTracks.push(id);
      return nextState;
    }

    case 'REQ_TRACK_DATA': {
      const id = action.trackId;
      const nextState = {...state};
      const nextTracks = nextState.tracks = {...state.tracks};
      const nextTrack = nextTracks[id] = {...nextTracks[id]};
      nextTrack.dataReq = {
        start: action.start,
        end: action.end,
        resolution: action.resolution
      };
      return nextState;
    }

    case 'CLEAR_TRACK_DATA_REQ': {
      const id = action.trackId;
      const nextState = {...state};
      const nextTracks = nextState.tracks = {...state.tracks};
      const nextTrack = nextTracks[id] = {...nextTracks[id]};
      nextTrack.dataReq = undefined;
      return nextState;
    }

    case 'EXECUTE_QUERY': {
      const nextState = {...state};
      nextState.queries = {...state.queries};
      nextState.queries[action.queryId] = {
        id: action.queryId,
        engineId: action.engineId,
        query: action.query,
      };
      return nextState;
    }

    case 'DELETE_QUERY': {
      const nextState = {...state};
      nextState.queries = {...state.queries};
      delete nextState.queries[action.queryId];
      return nextState;
    }

    case 'MOVE_TRACK': {
      if (!action.direction) {
        throw new Error('No direction given');
      }
      const id = action.trackId;
      const isPinned = state.pinnedTracks.includes(id);
      const isScrolling = state.scrollingTracks.includes(id);
      if (!isScrolling && !isPinned) {
        throw new Error(`No track with id ${id}`);
      }
      const nextState = {...state};
      const scrollingTracks = nextState.scrollingTracks =
          state.scrollingTracks.slice();
      const pinnedTracks = nextState.pinnedTracks = state.pinnedTracks.slice();

      const tracks = isPinned ? pinnedTracks : scrollingTracks;

      const oldIndex = tracks.indexOf(id);
      const newIndex = action.direction === 'up' ? oldIndex - 1 : oldIndex + 1;
      const swappedTrackId = tracks[newIndex];
      if (isPinned && newIndex === pinnedTracks.length) {
        // Move from last element of pinned to first element of scrolling.
        scrollingTracks.unshift(pinnedTracks.pop()!);
      } else if (isScrolling && newIndex === -1) {
        // Move first element of scrolling to last element of pinned.
        pinnedTracks.push(scrollingTracks.shift()!);
      } else if (swappedTrackId) {
        tracks[newIndex] = id;
        tracks[oldIndex] = swappedTrackId;
      } else {
        return state;
      }
      return nextState;
    }

    case 'TOGGLE_TRACK_PINNED': {
      const id = action.trackId;
      const isPinned = state.pinnedTracks.includes(id);

      const nextState = {...state};
      const pinnedTracks = nextState.pinnedTracks = [...state.pinnedTracks];
      const scrollingTracks = nextState.scrollingTracks =
          [...state.scrollingTracks];
      if (isPinned) {
        pinnedTracks.splice(pinnedTracks.indexOf(id), 1);
        scrollingTracks.unshift(id);
      } else {
        scrollingTracks.splice(scrollingTracks.indexOf(id), 1);
        pinnedTracks.push(id);
      }
      return nextState;
    }

    case 'SET_ENGINE_READY': {
      const nextState = {...state};  // Creates a shallow copy.
      nextState.engines = {...state.engines};
      nextState.engines[action.engineId].ready = action.ready;
      return nextState;
    }

    case 'CREATE_PERMALINK': {
      const nextState = {...state};
      nextState.permalink = {requestId: action.requestId, hash: undefined};
      return nextState;
    }

    case 'SET_PERMALINK': {
      // Drop any links for old requests.
      if (state.permalink.requestId !== action.requestId) return state;

      const nextState = {...state};
      nextState.permalink = {requestId: action.requestId, hash: action.hash};
      return nextState;
    }

    case 'LOAD_PERMALINK': {
      const nextState = {...state};
      nextState.permalink = {requestId: action.requestId, hash: action.hash};
      return nextState;
    }

    case 'SET_STATE': {
      return action.newState;
    }

    case 'SET_TRACE_TIME': {
      const nextState = {...state};
      nextState.traceTime.startSec = action.startSec;
      nextState.traceTime.endSec = action.endSec;
      nextState.traceTime.lastUpdate = action.lastUpdate;
      return nextState;
    }

    case 'SET_VISIBLE_TRACE_TIME': {
      const nextState = {...state};
      nextState.visibleTraceTime.startSec = action.startSec;
      nextState.visibleTraceTime.endSec = action.endSec;
      nextState.visibleTraceTime.lastUpdate = action.lastUpdate;
      return nextState;
    }

    case 'UPDATE_STATUS': {
      const nextState = {...state};
      nextState.status = {msg: action.msg, timestamp: action.timestamp};
      return nextState;
    }

    default:
      break;
  }
  return state;
}

export class Model {
  private _state: State;

  constructor() {
    this._state = createEmptyState();
  }

  get state(): State {
    return this._state;
  }

  // tslint:disable-next-line no-any
  doAction(action: any): void {
    this._state = rootReducer(this._state, action);
  }
}
