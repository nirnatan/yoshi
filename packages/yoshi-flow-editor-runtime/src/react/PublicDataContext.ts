import { createContext } from 'react';

export interface IPublicDataContext {
  ready: boolean;
  readyPromise?: Promise<boolean>;
  set?: (key: string, value: any) => void;
  // It actually returns PublicData | boolean | null | Promise<boolean>
  // We just don't have the PublicData type yet
  get?: (key: string) => any;
  type?: PublicDataType;
}

export interface IPublicData {
  set: (key: string, value: any) => void;
  get: (key: string) => any;
}

export enum PublicDataType {
  ViewerPublicData,
  EditorPublicData,
}

export const PublicDataContext = createContext<IPublicDataContext>({
  ready: false,
});
