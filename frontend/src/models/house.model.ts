import { User } from './user.model';
import { HousePresetType } from '../utils/housePresets';

export interface HouseAddress {
  id?: number;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  fullAddress?: string;
}

export interface HouseMember {
  id: string;
  uid?: string;
  name: string;
  nickname?: string | null;
  profilePictureUrl?: string | null;
  email: string;
  phoneNumber?: string | null;
  isAdmin: boolean;
  isOwner: boolean;
  joinedAt: string;
  entryDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'BANNED';
}

export interface House {
  id: string;
  name: string;
  code: string;
  presetType: HousePresetType;
  hasSharedFund: boolean;
  requireExpenseApproval: boolean;
  allMembersAdmin: boolean;
  address?: HouseAddress | null;
  ownerId: string;
  ownerName: string;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHouseResponse {
  house: House;
  user?: User;
  token?: string;
  refreshToken?: string;
  message?: string;
}

export interface CreateHouseRequest {
  name: string;
  presetType?: HousePresetType;
  hasSharedFund?: boolean;
  requireExpenseApproval?: boolean;
  allMembersAdmin?: boolean;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface UpdateHouseRequest {
  name?: string;
  presetType?: HousePresetType;
  hasSharedFund?: boolean;
  requireExpenseApproval?: boolean;
  allMembersAdmin?: boolean;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  address?: Partial<HouseAddress>;
}

export interface JoinHouseRequest {
  code: string;
}

export interface JoinHouseResponse {
  token: string;
  refreshToken?: string;
  user: User;
  house: House;
  message?: string;
}

export interface RegenerateCodeResponse {
  code: string;
  message?: string;
}
