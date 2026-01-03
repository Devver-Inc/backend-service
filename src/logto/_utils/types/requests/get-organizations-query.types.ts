export class GetOrganizationQuery {
  /**
   * The query to filter organizations. It can be a partial ID or name.
   * If not provided, all organizations will be returned.
   * @see (@link https://openapi.logto.io/operation/operation-listorganizations)
   */
  q?: string

  /**
   * Whether to show featured users in the organization. Featured users are randomly selected from the organization members.
   * If not provided, featuredUsers will not be included in the response.
   * @see (@link https://openapi.logto.io/operation/operation-listorganizations)
   */
  showFeatured?: string

  /**
   * Page number (starts from 1).
   * Minimum value is 1. Default value is 1.
   * @see (@link https://openapi.logto.io/operation/operation-listorganizations)
   */
  page?: number

  /**
   * Entries per page.
   * Minimum value is 1. Default value is 20.
   * @see (@link https://openapi.logto.io/operation/operation-listorganizations)
   */
  page_size?: number
}
