/*
 * Copyright (C) 2017 The Android Open foo Project
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

#include "ipc/deferred.h"

#include "gtest/gtest.h"

#include "deferred_unittest_messages.pb.h"  // Autogenerated from the .proto.

namespace perfetto {
namespace ipc {
namespace {

TEST(DeferredTest, BindAndResolve) {
  Deferred<TestMessage> deferred;
  std::shared_ptr<int> num_callbacks(new int{0});
  deferred.Bind([num_callbacks](AsyncResult<TestMessage> msg) {
    ASSERT_TRUE(msg.success());
    ASSERT_EQ(42, msg->num());
    ASSERT_EQ("foo", msg->str());
    (*num_callbacks)++;
  });

  AsyncResult<TestMessage> res = AsyncResult<TestMessage>::New();
  res->set_num(42);
  (*res).set_str("foo");
  deferred.Resolve(std::move(res));

  // A second call to Resolve() or Reject() shouldn't have any effect beause we
  // didn't set has_more.
  deferred.Resolve(std::move(res));
  deferred.Reject();

  ASSERT_EQ(1, *num_callbacks);
}

// In case of a Reject() a callback with a nullptr should be received.
TEST(DeferredTest, BindAndFail) {
  Deferred<TestMessage> deferred;
  std::shared_ptr<int> num_callbacks(new int{0});
  deferred.Bind([num_callbacks](AsyncResult<TestMessage> msg) {
    ASSERT_FALSE(msg.success());
    ASSERT_EQ(nullptr, &*msg);
    (*num_callbacks)++;
  });

  AsyncResult<TestMessage> res = AsyncResult<TestMessage>::New();
  deferred.Reject();
  deferred.Resolve(std::move(res));  // This should have no effect.
  deferred.Reject();                 // ditto.

  ASSERT_EQ(1, *num_callbacks);
}

// Test the RAII behavior.
TEST(DeferredTest, AutoRejectIfOutOfScope) {
  std::shared_ptr<int> num_callbacks(new int{0});
  {
    Deferred<TestMessage> deferred;
    deferred.Bind([num_callbacks](AsyncResult<TestMessage> msg) {
      ASSERT_FALSE(msg.success());
      (*num_callbacks)++;
    });
  }
  ASSERT_EQ(1, *num_callbacks);
}

// Binds two callbacks one after the other and tests that the bind state of the
// first callback is released.
TEST(DeferredTest, BindTwiceDoesNotHoldBindState) {
  // Use shared_ptr's use_count() to infer the bind state of the callback.
  std::shared_ptr<int> num_callbacks(new int{0});
  Deferred<TestMessage> deferred;
  deferred.Bind(
      [num_callbacks](AsyncResult<TestMessage>) { (*num_callbacks)++; });

  // At this point both the shared_ptr above and the callback in |deferred| are
  // refcounting the bind state.
  ASSERT_GE(num_callbacks.use_count(), 2);

  // Re-binding the callback should release the bind state, without invoking the
  // old callback.
  deferred.Bind([](AsyncResult<TestMessage> msg) {});
  ASSERT_EQ(1, num_callbacks.use_count());
  ASSERT_EQ(0, *num_callbacks);

  // Test that the new callback is invoked when re-bindings.
  deferred.Bind([num_callbacks](AsyncResult<TestMessage> msg) {
    ASSERT_TRUE(msg.success());
    ASSERT_EQ(4242, msg->num());
    (*num_callbacks)++;
  });
  AsyncResult<TestMessage> res = AsyncResult<TestMessage>::New();
  res->set_num(4242);
  deferred.Resolve(std::move(res));
  ASSERT_EQ(1, *num_callbacks);
  ASSERT_EQ(1, num_callbacks.use_count());
}

TEST(DeferredTest, MoveOperators) {
  Deferred<TestMessage> deferred;
  std::shared_ptr<int> num_callbacks(new int{0});
  std::function<void(AsyncResult<TestMessage>)> callback =
      [num_callbacks](AsyncResult<TestMessage> msg) {
        ASSERT_TRUE(msg.success());
        ASSERT_GE(msg->num(), 42);
        ASSERT_LE(msg->num(), 43);
        ASSERT_EQ(std::to_string(msg->num()), msg->str());
        (*num_callbacks)++;
      };
  deferred.Bind(callback);

  // Do a bit of std::move() dance with both the Deferred and the AsyncResult.
  AsyncResult<TestMessage> res = AsyncResult<TestMessage>::New();
  res->set_num(42);
  AsyncResult<TestMessage> res_moved(std::move(res));
  res = std::move(res_moved);
  res->set_str("42");
  res_moved = std::move(res);

  Deferred<TestMessage> deferred_moved(std::move(deferred));
  deferred = std::move(deferred_moved);
  deferred_moved = std::move(deferred);

  deferred.Reject();  // Nothing should happen yet, |deferred| has been cleared.
  ASSERT_EQ(0, *num_callbacks);

  deferred_moved.Resolve(std::move(res_moved));  // This, instead, should fire.
  ASSERT_EQ(1, *num_callbacks);

  // |deferred| and |res| have lost their state but shoould remain reusable.
  deferred.Bind(callback);
  res = AsyncResult<TestMessage>::New();
  res->set_num(43);
  res->set_str("43");
  deferred.Resolve(std::move(res));
  ASSERT_EQ(2, *num_callbacks);

  // Finally re-bind |deferred|, move it to a new scoped Deferred and verify
  // that the moved-into object still auto-nacks the callback.
  deferred.Bind([num_callbacks](AsyncResult<TestMessage> msg) {
    ASSERT_FALSE(msg.success());
    (*num_callbacks)++;
  });
  { Deferred<TestMessage> scoped_deferred(std::move(deferred)); }
  ASSERT_EQ(3, *num_callbacks);
  callback = nullptr;
  ASSERT_EQ(1, num_callbacks.use_count());
}

// Covers the case of a streaming reply, where the deferred keeps being resolved
// until has_more == true.
TEST(DeferredTest, StreamingReply) {
  Deferred<TestMessage> deferred;
  std::shared_ptr<int> num_callbacks(new int{0});
  std::function<void(AsyncResult<TestMessage>)> callback =
      [num_callbacks](AsyncResult<TestMessage> msg) {
        ASSERT_TRUE(msg.success());
        ASSERT_EQ(*num_callbacks, msg->num());
        ASSERT_EQ(std::to_string(*num_callbacks), msg->str());
        ASSERT_EQ(msg->num() < 3, msg.has_more());
        (*num_callbacks)++;
      };
  deferred.Bind(callback);

  for (int i = 0; i < 3; i++) {
    AsyncResult<TestMessage> res = AsyncResult<TestMessage>::New();
    res->set_num(i);
    res->set_str(std::to_string(i));
    res.set_has_more(true);
    AsyncResult<TestMessage> res_moved(std::move(res));
    deferred.Resolve(std::move(res_moved));
  }

  Deferred<TestMessage> deferred_moved(std::move(deferred));
  AsyncResult<TestMessage> res = AsyncResult<TestMessage>::New();
  res->set_num(3);
  res->set_str(std::to_string(3));
  res.set_has_more(false);
  deferred_moved.Resolve(std::move(res));
  ASSERT_EQ(4, *num_callbacks);

  // At this point reject should have no effect.
  deferred_moved.Reject();
  ASSERT_EQ(4, *num_callbacks);
  callback = nullptr;
  ASSERT_EQ(1, num_callbacks.use_count());
}

// Similar to the above, but checks that destroying a Deferred without having
// resolved with has_more == true automatically rejects once out of scope.
TEST(DeferredTest, StreamingReplyIsRejectedOutOfScope) {
  std::shared_ptr<int> num_callbacks(new int{0});

  {
    Deferred<TestMessage> deferred;
    deferred.Bind([num_callbacks](AsyncResult<TestMessage> msg) {
      ASSERT_EQ((*num_callbacks) < 3, msg.success());
      ASSERT_EQ(msg.success(), msg.has_more());
      (*num_callbacks)++;
    });

    for (int i = 0; i < 3; i++) {
      AsyncResult<TestMessage> res = AsyncResult<TestMessage>::New();
      res.set_has_more(true);
      deferred.Resolve(std::move(res));
    }

    // |deferred_moved| going out of scope should cause a Reject().
    { Deferred<TestMessage> deferred_moved = std::move(deferred); }
    ASSERT_EQ(4, *num_callbacks);
  }

  // |deferred| going out of scope should do noting, it has been std::move()'d.
  ASSERT_EQ(4, *num_callbacks);
  ASSERT_EQ(1, num_callbacks.use_count());
}

}  // namespace
}  // namespace ipc
}  // namespace perfetto
