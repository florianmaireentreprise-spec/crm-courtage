"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { addContactReseau } from "@/app/(app)/reseau/actions";
import { ReseauContactDialog } from "./ReseauContactDialog";

export function AddContactButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Ajouter un contact
      </Button>

      <ReseauContactDialog
        mode="create"
        open={open}
        onOpenChange={setOpen}
        onSubmit={addContactReseau}
      />
    </>
  );
}
