import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const HomeNavbar = () => {
  return (
    <div className="flex w-full items-center justify-between py-2">
      <div className="flex-1">
        <p className="text-4xl font-extrabold font-sans">VOD_LOGO</p>
      </div>

      <div className="flex-2">
        <div className="flex items-center  h-12">
            <Input placeholder="Search" className="rounded-r-none h-full text-2xl bg-accent" />
            <Button className="rounded-l-none h-full" variant={"outline"}>
                <Search width={20} height={20}/>
            </Button>
        </div>
      </div>

      <div className="flex-1 items-center justify-end flex">
        <Button className="w-fit" variant={"outline"}>
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
         
        </Button>
      </div>
    </div>
  );
};

export default HomeNavbar;
