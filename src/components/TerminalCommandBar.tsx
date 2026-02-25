import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Terminal } from "lucide-react";
import { parseTerminalCommand, commandToReferencesQuery } from "@/lib/terminalCommands";

export function TerminalCommandBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = useState("");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!value.trim()) return;

    const command = parseTerminalCommand(value);
    const params = commandToReferencesQuery(command);

    setValue("");
    if (location.pathname !== "/references") {
      navigate(`/references?${params.toString()}`);
      return;
    }

    navigate({ pathname: "/references", search: params.toString() });
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      <label className="sr-only" htmlFor="terminal-command-input">
        Terminal command
      </label>
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 h-10">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        <input
          id="terminal-command-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="/isotope Cu-64  |  /trend Pb-208 10y  |  /compare Cu-64 vs Zn-68"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </form>
  );
}
