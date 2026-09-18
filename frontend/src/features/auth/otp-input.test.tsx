import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { OtpInput } from "./auth-shell";

function ControlledOtp() {
  const [value, setValue] = useState("");
  return <OtpInput value={value} onChange={setValue} />;
}

describe("OtpInput", () => {
  it("accepts pasted codes with separators and preserves leading zeroes", async () => {
    const user = userEvent.setup();
    render(<ControlledOtp />);
    const input = screen.getByRole("textbox", { name: "Mã OTP" });
    await user.click(input);
    await user.paste("01 23-45");
    expect(input).toHaveValue("012345");
  });

  it("supports keyboard corrections and ignores non-digits", async () => {
    const user = userEvent.setup();
    render(<ControlledOtp />);
    const input = screen.getByRole("textbox", { name: "Mã OTP" });
    await user.type(input, "12a3456");
    expect(input).toHaveValue("123456");
    await user.keyboard("{ArrowLeft}{Backspace}9");
    expect(input).toHaveValue("123496");
  });
});
