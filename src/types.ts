export interface Train {
  OperationalTrainNumber: string;
  OperationalTrainDepartureDate: string;
  JourneyPlanNumber?: string;
  JourneyPlanDepartureDate?: string;
  AdvertisedTrainNumber?: string;
}

export interface Position {
  SWEREF99TM?: string; // WKT format: "POINT (x y)"
  WGS84?: string; // WKT format: "POINT (lon lat)"
}

export interface LocationData {
  LocationName?: string;
  Priority?: number;
  Order?: number;
}

export interface ProductInfo {
  Code?: string;
  Description?: string;
}

export interface PositionRecord {
  Train: Train;
  Position: Position;
  TimeStamp: string;
  Bearing?: number;
  Speed?: number;
}

export interface AnnouncementRecord {
  ActivityType: string;
  AdvertisedTimeAtLocation: string;
  AdvertisedTrainIdent: string;
  FromLocation: LocationData[];
  ToLocation: LocationData[];
  LocationSignature: string;
  ProductInformation: ProductInfo[];
  TimeAtLocationWithSeconds: string;
}

export interface TrafikverketInfo {
  SSEURL: string;
}

export interface TrafikverketResultItem {
  TrainPosition?: PositionRecord[];
  TrainAnnouncement?: AnnouncementRecord[];
  INFO: TrafikverketInfo;
}

export interface TrafikverketResponseData {
  RESULT: TrafikverketResultItem[];
}

export interface TrafikverketResponse {
  RESPONSE: TrafikverketResponseData;
}
