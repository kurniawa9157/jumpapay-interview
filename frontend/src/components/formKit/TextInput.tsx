import React from "react";
import { TextField } from "@idds/react";

export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "prefix" | "size"> {
  value: string;
  onChange: (value: string) => void;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  verified?: boolean;
  error?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({ value, onChange, placeholder, type = "text", prefix, suffix, verified, error, className = "", ...props }) => {
  let status: "neutral" | "error" | "success" = "neutral";
  if (error) status = "error";
  else if (verified) status = "success";

  return (
    <TextField
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      prefixIcon={prefix}
      suffixIcon={suffix}
      status={status}
      className={className}
      {...props}
    />
  );
};
