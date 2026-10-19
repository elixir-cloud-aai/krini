type TESServer = {
  description?: string
  environment: string
  id: string
  name: string
  organization: Organization
  type: Type
  url: string
  version: string
}

type Organization = {
  name: string
  url: string
}

type Type = {
  artifact: string
  group: string
  version: string
}
