import { A } from "@solidjs/router";
import { useChat } from "@kodehort/ai-sdk-solid";
import { createSignal, For, Show } from "solid-js";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppHomeProps = {
  userEmail: string;
  userName: string | null;
};

export default function AppHome(props: AppHomeProps) {
  const [input, setInput]=createSignal("");
  const chat=useChat();
  const  handleSubmit=async (e:Event)=>{
    e.preventDefault();
    const prompt=input().trim();
    if(!prompt){
      return
    }
    setInput("")
    await chat.sendMessage({text: prompt})
  }
  return (
   <div>
     <div>
       <Show when={chat.messages.length===0}>
         Please send a message 
       </Show>
       <For each={chat.messages}>
         {(message)=>{
           <div>
             
           </div>
         }}
       </For>
     </div>
   </div>
  );
}
