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

#ifndef TRACING_INCLUDE_TRACING_CORE_SHARED_MEMORY_H_
#define TRACING_INCLUDE_TRACING_CORE_SHARED_MEMORY_H_

#include <stddef.h>

#include <memory>

namespace perfetto {

// Both this class and the Factory are subclassed by the transport layer
// (e.g., src/unix_rpc). This is to allow it to attach platform specific fields
// (e.g., a unix file descriptor) and do platform specific initialization.
class SharedMemory {
 public:
  class Factory {
   public:
    virtual ~Factory() {}
    virtual std::unique_ptr<SharedMemory> CreateSharedMemory(size_t) = 0;
  };

  // The transport layer is expected to tear down the resource associated to
  // this object region when destroyed.
  virtual ~SharedMemory() {}

  virtual void* start() const = 0;
  virtual size_t size() const = 0;
};

}  // namespace perfetto

#endif  // TRACING_INCLUDE_TRACING_CORE_SHARED_MEMORY_H_
