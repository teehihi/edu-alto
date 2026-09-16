import { render, screen } from "@testing-library/react";
import React from "react";
import { Button } from "./button";

describe("Button", () => {
  it("disables the button while loading", () => {
    render(<Button loading>Đang lưu</Button>);

    expect(screen.getByRole("button", { name: /đang lưu/i })).toBeDisabled();
  });
});
