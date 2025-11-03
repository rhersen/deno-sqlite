import type { TrafikverketResponse } from "./types.ts";

const TRAFIKVERKET_API_KEY = Deno.env.get("TRAFIKVERKET_API_KEY");

if (!TRAFIKVERKET_API_KEY) {
  throw new Error("TRAFIKVERKET_API_KEY environment variable is not set");
}

const headers = {
  "Content-Type": "application/xml",
  Accept: "application/json",
};

const minutes = 6e4;

export function buildPositionQuery(): string {
  const since = new Date(Date.now() - 8 * minutes).toISOString();
  return `
<REQUEST>
  <LOGIN authenticationkey='${TRAFIKVERKET_API_KEY}' />
  <QUERY objecttype='TrainPosition' namespace='järnväg.trafikinfo' sseurl='true' schemaversion='1.1'>
    <FILTER>
      <GT name='TimeStamp' value='${since}'/>
      <LIKE name='Train.AdvertisedTrainNumber' value='/^(?:2[2-9]\\d\\d|12[89]\\d\\d|52[2-7]\\d\\d)$/' />
    </FILTER>
    <INCLUDE>Bearing</INCLUDE>
    <INCLUDE>Position</INCLUDE>
    <INCLUDE>Speed</INCLUDE>
    <INCLUDE>TimeStamp</INCLUDE>
    <INCLUDE>Train</INCLUDE>
  </QUERY>
</REQUEST>`;
}

export function buildAnnouncementQuery(): string {
  const since = new Date(Date.now() - 8 * minutes).toISOString();
  return `
<REQUEST>
  <LOGIN authenticationkey='${TRAFIKVERKET_API_KEY}' />
  <QUERY objecttype='TrainAnnouncement' orderby='AdvertisedTimeAtLocation' sseurl='true' schemaversion='1.6'>
    <FILTER>
      <LIKE name='AdvertisedTrainIdent' value='/^(?:2[2-9]\\d\\d|12[89]\\d\\d|52[2-7]\\d\\d)$/' />
      <GT name='TimeAtLocationWithSeconds' value='${since}' />
      <EXISTS name='ToLocation' value='true' />
    </FILTER>
    <INCLUDE>ActivityType</INCLUDE>
    <INCLUDE>AdvertisedTimeAtLocation</INCLUDE>
    <INCLUDE>AdvertisedTrainIdent</INCLUDE>
    <INCLUDE>FromLocation</INCLUDE>
    <INCLUDE>LocationSignature</INCLUDE>
    <INCLUDE>ProductInformation</INCLUDE>
    <INCLUDE>TimeAtLocationWithSeconds</INCLUDE>
    <INCLUDE>ToLocation</INCLUDE>
  </QUERY>
</REQUEST>`;
}

export async function fetchTrafikverket(
  body: string,
): Promise<TrafikverketResponse> {
  const response = await fetch(
    "https://api.trafikinfo.trafikverket.se/v2/data.json",
    { method: "POST", body, headers },
  );

  if (!response.ok) {
    throw new Error(
      `Trafikverket API error: ${response.status} ${response.statusText} ${await response
        .text()}`,
    );
  }

  return (await response.json()) as TrafikverketResponse;
}

export async function parseSseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onMessage: (data: TrafikverketResponse) => void,
): Promise<void> {
  let buffer = "";
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.at(-1) as string;

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line.startsWith("data: ")) {
        try {
          onMessage(JSON.parse(line.slice(6)));
        } catch (error) {
          console.error("Error parsing SSE message:", error);
        }
      }
    }
  }
}
