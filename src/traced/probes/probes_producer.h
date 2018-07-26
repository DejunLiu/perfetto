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

#ifndef SRC_TRACED_PROBES_PROBES_PRODUCER_H_
#define SRC_TRACED_PROBES_PROBES_PRODUCER_H_

#include <map>
#include <memory>
#include <utility>

#include "perfetto/base/task_runner.h"
#include "perfetto/base/watchdog.h"
#include "perfetto/tracing/core/producer.h"
#include "perfetto/tracing/core/trace_writer.h"
#include "perfetto/tracing/core/tracing_service.h"
#include "src/traced/probes/filesystem/inode_file_data_source.h"
#include "src/traced/probes/ftrace/ftrace_controller.h"
#include "src/traced/probes/ftrace/ftrace_metadata.h"
#include "src/traced/probes/ps/process_stats_data_source.h"

#include "perfetto/trace/filesystem/inode_file_map.pbzero.h"

namespace perfetto {

const uint64_t kLRUInodeCacheSize = 1000;

class ProbesProducer : public Producer {
 public:
  ProbesProducer();
  ~ProbesProducer() override;

  // Producer Impl:
  void OnConnect() override;
  void OnDisconnect() override;
  void CreateDataSourceInstance(DataSourceInstanceID,
                                const DataSourceConfig&) override;
  void TearDownDataSourceInstance(DataSourceInstanceID) override;
  void OnTracingSetup() override;
  void Flush(FlushRequestID,
             const DataSourceInstanceID* data_source_ids,
             size_t num_data_sources) override;

  // Our Impl
  void ConnectWithRetries(const char* socket_name,
                          base::TaskRunner* task_runner);
  bool CreateFtraceDataSourceInstance(TracingSessionID session_id,
                                      DataSourceInstanceID id,
                                      const DataSourceConfig& config);
  void CreateProcessStatsDataSourceInstance(TracingSessionID session_id,
                                            DataSourceInstanceID id,
                                            const DataSourceConfig& config);
  void CreateInodeFileDataSourceInstance(TracingSessionID session_id,
                                         DataSourceInstanceID id,
                                         DataSourceConfig config);

  void OnMetadata(const FtraceMetadata& metadata);

 private:
  enum State {
    kNotStarted = 0,
    kNotConnected,
    kConnecting,
    kConnected,
  };

  ProbesProducer(const ProbesProducer&) = delete;
  ProbesProducer& operator=(const ProbesProducer&) = delete;

  void Connect();
  void Restart();
  void ResetConnectionBackoff();
  void IncreaseConnectionBackoff();
  void AddWatchdogsTimer(DataSourceInstanceID id,
                         const DataSourceConfig& source_config);

  State state_ = kNotStarted;
  base::TaskRunner* task_runner_ = nullptr;
  std::unique_ptr<TracingService::ProducerEndpoint> endpoint_ = nullptr;
  std::unique_ptr<FtraceController> ftrace_ = nullptr;
  bool ftrace_creation_failed_ = false;
  uint32_t connection_backoff_ms_ = 0;
  const char* socket_name_ = nullptr;
  std::set<DataSourceInstanceID> failed_sources_;
  std::map<DataSourceInstanceID, std::unique_ptr<ProcessStatsDataSource>>
      process_stats_sources_;
  std::map<DataSourceInstanceID, std::unique_ptr<FtraceDataSource>>
      ftrace_data_sources_;
  std::map<DataSourceInstanceID, base::Watchdog::Timer> watchdogs_;
  std::map<DataSourceInstanceID, std::unique_ptr<InodeFileDataSource>>
      file_map_sources_;
  LRUInodeCache cache_{kLRUInodeCacheSize};
  std::map<BlockDeviceID, std::unordered_map<Inode, InodeMapValue>>
      system_inodes_;
};

}  // namespace perfetto

#endif  // SRC_TRACED_PROBES_PROBES_PRODUCER_H_
