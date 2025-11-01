import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center  font-sans">
      <div>
        <h2 className="text-7xl font-extrabold">LANDING PAGE</h2>
      </div>

      <div className="flex gap-2 mt-5">
        <div>
        <Link href={"/auth/sign-up"}>
        <Button variant={"outline"}>Sign-up</Button>
        </Link>
      </div>
      <div>
        <Link href={"/auth/sign-in"}>
        <Button variant={"outline"}>Sign-in</Button>        
        </Link>
      </div>
      </div>




    </div>
  );
}
