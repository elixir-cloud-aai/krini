export type WESServer = {
  contactUrl: string
  createdAt: string
  description: string
  documentationUrl: string
  environment: string
  id: string
  name: string
  organization: Organization
  type: Type
  updatedAt: string
  url: string
  version: string
}

interface Organization {
  name: string
  url: string
}

interface Type {
  artifact: string
  group: string
  version: string
}
