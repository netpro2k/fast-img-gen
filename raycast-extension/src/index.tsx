import { Action, ActionPanel, Clipboard, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { UsePromiseReturnType } from "@raycast/utils/dist/types";
import fetch from "cross-fetch";
import fs from "fs";
import os from "os";
import path from "path";
import { MutableRefObject, useRef, useState } from "react";

async function downloadFileToTemp(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, path.basename(url));
  const fileStream = fs.createWriteStream(tempFilePath);

  return new Promise((resolve, reject) => {
    (response.body as any).pipe(fileStream);
    (response.body as any).on("error", reject);
    fileStream.on("finish", () => resolve(tempFilePath));
  });
}

type APIResponse = { images: string[] };

export default function Command() {
  const [prompt, setPrompt] = useState("");

  const abortable = useRef<AbortController>();
  const { isLoading, data, revalidate }: UsePromiseReturnType<APIResponse> = usePromise(
    (prompt: string) => {
      return new Promise(async (resolve, reject) => {
        clearTimeout(searchTimeoutRef.current);
        if (!prompt) return resolve({ images: [] });
        searchTimeoutRef.current = setTimeout(async () => {
          const url = `http://localhost:5000/get-image?prompt=${encodeURIComponent(prompt)}`;
          try {
            const res = await fetch(url, { signal: abortable.current?.signal });
            const data = await res.json();
            resolve(data);
          } catch (e) {
            reject(e);
          }
        }, 200);
      });
    },
    [prompt],
    {
      abortable,
    },
  );

  const searchTimeoutRef: MutableRefObject<NodeJS.Timeout | undefined> = useRef();

  return (
    <Grid columns={3} isLoading={isLoading} searchText={prompt} onSearchTextChange={setPrompt}>
      {(data?.images || []).map((imgUrl) => (
        <Grid.Item
          content={imgUrl}
          title={imgUrl}
          key={imgUrl}
          actions={
            <ActionPanel>
              <Action
                title="Paste"
                onAction={async () => {
                  const file = await downloadFileToTemp(imgUrl);
                  console.log("clicked", file);
                  Clipboard.paste({ file });
                  // TODO is this running? Is there a better way to do this?
                  setTimeout(() => {
                    console.log("deleting", file);
                    fs.unlinkSync(file);
                  }, 30000);
                }}
              />
              <Action
                title="Refresh"
                icon={{ source: Icon.ArrowCounterClockwise, tintColor: "blue" }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
