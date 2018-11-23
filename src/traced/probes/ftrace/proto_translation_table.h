/*
 * Copyright (C) 2017 The Android Open Source Project
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

#ifndef SRC_TRACED_PROBES_FTRACE_PROTO_TRANSLATION_TABLE_H_
#define SRC_TRACED_PROBES_FTRACE_PROTO_TRANSLATION_TABLE_H_

#include <stdint.h>

#include <map>
#include <memory>
#include <set>
#include <string>
#include <vector>

#include "perfetto/base/scoped_file.h"
#include "src/traced/probes/ftrace/event_info.h"
#include "src/traced/probes/ftrace/format_parser.h"

namespace perfetto {

class FtraceProcfs;

namespace protos {
namespace pbzero {
class FtraceEventBundle;
}  // namespace pbzero
}  // namespace protos

// Used when reading the config to store the group and name info for the
// ftrace event.
class GroupAndName {
 public:
  GroupAndName(const std::string& group, const std::string& name)
      : group_(group), name_(name) {}

  bool operator==(const GroupAndName& other) const {
    return std::tie(group_, name_) == std::tie(other.group(), other.name());
  }

  bool operator<(const GroupAndName& other) const {
    return std::tie(group_, name_) < std::tie(other.group(), other.name());
  }

  const std::string& name() const { return name_; }
  const std::string& group() const { return group_; }

  std::string ToString() const { return group_ + "/" + name_; }

 private:
  std::string group_;
  std::string name_;
};

bool InferFtraceType(const std::string& type_and_name,
                     size_t size,
                     bool is_signed,
                     FtraceFieldType* out);

class ProtoTranslationTable {
 public:
  struct FtracePageHeaderSpec {
    FtraceEvent::Field timestamp{};
    FtraceEvent::Field overwrite{};
    FtraceEvent::Field size{};
  };

  static FtracePageHeaderSpec DefaultPageHeaderSpecForTesting();

  // This method mutates the |events| and |common_fields| vectors to
  // fill some of the fields and to delete unused events/fields
  // before std:move'ing them into the ProtoTranslationTable.
  static std::unique_ptr<ProtoTranslationTable> Create(
      const FtraceProcfs* ftrace_procfs,
      std::vector<Event> events,
      std::vector<Field> common_fields);
  virtual ~ProtoTranslationTable();

  ProtoTranslationTable(const FtraceProcfs* ftrace_procfs,
                        const std::vector<Event>& events,
                        std::vector<Field> common_fields,
                        FtracePageHeaderSpec ftrace_page_header_spec);

  size_t largest_id() const { return largest_id_; }

  const std::vector<Field>& common_fields() const { return common_fields_; }

  // Retrieve the event by the group and name. If the group
  // is empty, an event with that name will be returned.
  // Virtual for testing.
  virtual const Event* GetEvent(const GroupAndName& group_and_name) const {
    if (!group_and_name_to_event_.count(group_and_name))
      return nullptr;
    return group_and_name_to_event_.at(group_and_name);
  }

  const std::vector<const Event*>* GetEventsByGroup(
      const std::string& group) const {
    if (!group_to_events_.count(group))
      return nullptr;
    return &group_to_events_.at(group);
  }

  const Event* GetEventById(size_t id) const {
    if (id == 0 || id > largest_id_)
      return nullptr;
    if (!events_.at(id).ftrace_event_id)
      return nullptr;
    return &events_.at(id);
  }

  size_t EventToFtraceId(const GroupAndName& group_and_name) const {
    if (!group_and_name_to_event_.count(group_and_name))
      return 0;
    return group_and_name_to_event_.at(group_and_name)->ftrace_event_id;
  }

  const std::vector<Event>& events() { return events_; }
  const FtracePageHeaderSpec& ftrace_page_header_spec() const {
    return ftrace_page_header_spec_;
  }

  // Retrieves the ftrace event from the proto translation
  // table. If it does not exist, reads the format file and creates a
  // new event with the proto id set to generic. Virtual for testing.
  virtual const Event* GetOrCreateEvent(const GroupAndName&);

  // This is for backwards compatibility. If a group is not specified in the
  // config then the first event with that name will be returned.
  const Event* GetEventByName(const std::string& name) const {
    if (!name_to_events_.count(name))
      return nullptr;
    return name_to_events_.at(name)[0];
  }

 private:
  ProtoTranslationTable(const ProtoTranslationTable&) = delete;
  ProtoTranslationTable& operator=(const ProtoTranslationTable&) = delete;

  // Store strings so they can be read when writing the trace output.
  const char* InternString(const std::string& str);

  uint16_t CreateGenericEventField(const FtraceEvent::Field& ftrace_field,
                                   Event& event);

  const FtraceProcfs* ftrace_procfs_;
  std::vector<Event> events_;
  size_t largest_id_;
  std::map<GroupAndName, const Event*> group_and_name_to_event_;
  std::map<std::string, std::vector<const Event*>> name_to_events_;
  std::map<std::string, std::vector<const Event*>> group_to_events_;
  std::vector<Field> common_fields_;
  FtracePageHeaderSpec ftrace_page_header_spec_{};
  std::set<std::string> interned_strings_;
};

// Class for efficient 'is event with id x enabled?' tests.
// Mirrors the data in a FtraceConfig but in a format better suited
// to be consumed by CpuReader.
class EventFilter {
 public:
  EventFilter();
  ~EventFilter();
  EventFilter(EventFilter&&) = default;
  EventFilter& operator=(EventFilter&&) = default;

  void AddEnabledEvent(size_t ftrace_event_id) {
    if (ftrace_event_id >= enabled_ids_.size())
      enabled_ids_.resize(ftrace_event_id + 1);
    enabled_ids_[ftrace_event_id] = true;
  }

  void DisableEvent(size_t ftrace_event_id) {
    if (ftrace_event_id + 1 > enabled_ids_.size())
      return;
    enabled_ids_[ftrace_event_id] = false;
  }

  bool IsEventEnabled(size_t ftrace_event_id) const {
    if (ftrace_event_id == 0 || ftrace_event_id > enabled_ids_.size())
      return false;
    return enabled_ids_[ftrace_event_id];
  }

  const std::vector<bool>& enabled_ids() const { return enabled_ids_; }

  void BitwiseOr(const EventFilter& other) {
    size_t max_length =
        std::max(enabled_ids_.size(), other.enabled_ids().size());
    enabled_ids_.resize(max_length);
    for (size_t i = 0; i < max_length; i++) {
      if (i >= other.enabled_ids().size())
        return;
      if (other.enabled_ids()[i])
        enabled_ids_[i] = true;
    }
  }

 private:
  EventFilter(const EventFilter&) = delete;
  EventFilter& operator=(const EventFilter&) = delete;

  std::vector<bool> enabled_ids_;
};

}  // namespace perfetto

#endif  // SRC_TRACED_PROBES_FTRACE_PROTO_TRANSLATION_TABLE_H_
