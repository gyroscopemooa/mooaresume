"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadGuestDraft } from "@/lib/guest-draft";

export default function ProCreateLayout({children}:{children:React.ReactNode}){
  const router=useRouter();
  useEffect(()=>{const guest=loadGuestDraft();if(guest?.temporaryWritingMode==="BUILD")router.replace("/pro/build");if(guest?.temporaryWritingMode==="POLISH")router.replace("/pro/polish")},[router]);
  return children;
}
