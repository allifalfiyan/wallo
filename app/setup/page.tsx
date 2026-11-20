import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { adaDompet } from "@/lib/accounts";
import SetupForm from "./SetupForm";

async function Setup() {
  await connection();
  if (adaDompet()) redirect("/");
  return <SetupForm />;
}

export default function SetupPage() {
  return (
    <Suspense fallback={<p className="p-8">Memuat...</p>}>
      <Setup />
    </Suspense>
  );
}