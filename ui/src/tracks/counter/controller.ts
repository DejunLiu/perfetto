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

import {fromNs} from '../../common/time';
import {
  TrackController,
  trackControllerRegistry
} from '../../controller/track_controller';

import {
  Config,
  COUNTER_TRACK_KIND,
  Data,
} from './common';

class CounterTrackController extends TrackController<Config, Data> {
  static readonly kind = COUNTER_TRACK_KIND;
  private busy = false;
  private setup = false;
  private maximumValueSeen = 0;
  private minimumValueSeen = 0;

  onBoundsChange(start: number, end: number, resolution: number): void {
    this.update(start, end, resolution);
  }

  private async update(start: number, end: number, resolution: number):
      Promise<void> {
    // TODO: we should really call TraceProcessor.Interrupt() at this point.
    if (this.busy) return;

    const startNs = Math.round(start * 1e9);
    const endNs = Math.round(end * 1e9);

    this.busy = true;
    if (!this.setup) {
      const result = await this.query(`
      select max(value), min(value) from
        counters where name = '${this.config.name}'
        and ref = ${this.config.ref}`);
      this.maximumValueSeen = +result.columns[0].doubleValues![0];
      this.minimumValueSeen = +result.columns[1].doubleValues![0];
      this.setup = true;
    }

    // TODO(hjd): Implement window clipping.
    const query = `select ts, value from counters
        where ${startNs} <= ts_end and ts <= ${endNs}
        and name = '${this.config.name}' and ref = ${this.config.ref};`;
    const rawResult = await this.query(query);

    const numRows = +rawResult.numRecords;

    const data: Data = {
      start,
      end,
      maximumValue: this.maximumValue(),
      minimumValue: this.minimumValue(),
      resolution,
      timestamps: new Float64Array(numRows),
      values: new Float64Array(numRows),
    };

    const cols = rawResult.columns;
    for (let row = 0; row < numRows; row++) {
      const startSec = fromNs(+cols[0].longValues![row]);
      const value = +cols[1].doubleValues![row];
      data.timestamps[row] = startSec;
      data.values[row] = value;
    }

    this.publish(data);
    this.busy = false;
  }

  private maximumValue() {
    return Math.max(this.config.maximumValue || 0, this.maximumValueSeen);
  }

  private minimumValue() {
    return Math.min(this.config.minimumValue || 0, this.minimumValueSeen);
  }

  private async query(query: string) {
    const result = await this.engine.query(query);
    if (result.error) {
      console.error(`Query error "${query}": ${result.error}`);
      throw new Error(`Query error "${query}": ${result.error}`);
    }
    return result;
  }
}

trackControllerRegistry.register(CounterTrackController);
