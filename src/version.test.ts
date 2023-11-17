// src/version.test.ts

import { handleVersionCmd } from "./version";

describe("handleVersionCmd", () => {
  test("should post version to channel", () => {
    const bot = {
      postMessage: jest.fn(),
    };
    const channel = "testChannel";
    const user = null;
    const message = "version";

    handleVersionCmd(bot, channel, user, message);

    expect(bot.postMessage).toHaveBeenCalledWith(
      channel,
      expect.stringContaining("running version"),
      false
    );
  });

  test("should post version to user", () => {
    const bot = {
      postMessageToUser: jest.fn(),
    };
    const channel = null;
    const user = { name: "testUser" };
    const message = "version";

    handleVersionCmd(bot, channel, user, message);

    expect(bot.postMessageToUser).toHaveBeenCalledWith(
      user.name,
      expect.stringContaining("running version"),
      expect.any(Object),
      expect.any(Function)
    );
  });
});
