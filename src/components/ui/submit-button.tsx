"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingText?: string;
} & Omit<React.ComponentProps<typeof Button>, "type" | "disabled">;

export function SubmitButton({ children, pendingText, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          {pendingText ?? "Enregistrement..."}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
