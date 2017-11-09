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

#ifndef FTRACE_TO_PROTO_TRANSLATION_TABLE_H_
#define FTRACE_TO_PROTO_TRANSLATION_TABLE_H_

#include <stdint.h>

#include <map>
#include <memory>
#include <string>
#include <vector>

#include "base/scoped_file.h"
#include "ftrace_event_bundle.pbzero.h"

namespace perfetto {

class FtraceToProtoTranslationTable {
 public:
  enum FtraceFieldType {
    kFtraceNumber = 0,
  };

  enum ProtoFieldType {
    kProtoNumber = 0,
  };

  struct Field {
    size_t ftrace_offset;
    size_t ftrace_size;
    FtraceFieldType ftrace_type;
    size_t proto_field_id;
    ProtoFieldType proto_field_type;
  };

  struct Event {
    std::string name;
    std::string group;
    std::vector<Field> fields;
    size_t ftrace_event_id;
    size_t proto_field_id;
  };

  static std::unique_ptr<FtraceToProtoTranslationTable> Create(
      std::string path_to_event_dir);
  ~FtraceToProtoTranslationTable();

  const Event* GetEventByName(std::string name) const;
  size_t largest_id() const { return largest_id_; }

 private:
  FtraceToProtoTranslationTable(std::map<size_t, Event> events,
                                std::vector<Field> common_fields);
  FtraceToProtoTranslationTable(const FtraceToProtoTranslationTable&) = delete;
  FtraceToProtoTranslationTable& operator=(
      const FtraceToProtoTranslationTable&) = delete;

  std::map<size_t, Event> events_;
  std::map<std::string, Event*> name_to_event_;
  std::vector<Field> common_fields_;
  size_t largest_id_;
};

}  // namespace perfetto

#endif  // FTRACE_TO_PROTO_TRANSLATION_TABLE_H_
