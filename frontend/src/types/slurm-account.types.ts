export interface SlurmAccount {
  name: string;
  description: string;
  organization: string;
}

export interface SlurmAccountsResponse {
  accounts: SlurmAccount[];
}

export interface SlurmAssociation {
  user?: string;
  account?: string;
  cluster?: string;
  partition?: string;
}

export interface SlurmAssociationsResponse {
  associations: SlurmAssociation[];
}

export interface CreateAccountRequest {
  name: string;
  description?: string;
  organization?: string;
}

export interface AssociateUserRequest {
  username: string;
  accountName: string;
}
