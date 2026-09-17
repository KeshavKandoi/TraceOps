import type { AgentState } from "../agent/state.js";
import type { Model, ModelResponse } from "./model.js";

export class FakeModelExhaustedError extends Error {
  constructor(callCount: number, scriptedCount: number) {
    super(
      `FakeModel has no more scripted responses: decide() was called ${callCount} time(s), but only ${scriptedCount} response(s) were provided.`,
    );
    this.name = "FakeModelExhaustedError";
  }
}

export class FakeModel implements Model {
  private readonly responses: ModelResponse[];
  private callCount = 0;

  constructor(responses: ModelResponse[]) {
    this.responses = [...responses];
  }

  async decide(_state: AgentState): Promise<ModelResponse> {
    const nextResponse = this.responses[this.callCount];
    this.callCount += 1;

    if (nextResponse === undefined) {
      throw new FakeModelExhaustedError(this.callCount, this.responses.length);
    }

    return nextResponse;
  }

  get calls(): number {
    return this.callCount;
  }

  get remaining(): number {
    return Math.max(this.responses.length - this.callCount, 0);
  }
}
