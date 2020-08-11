/**
 * SQL 查询片断
 */
export const sqlFragment = {
  leftJoinUser: `
    LEFT JOIN user
      ON user.id = comment.userId
    LEFT JOIN avatar
      ON user.id = avatar.userId
  `,
  user: `
    JSON_OBJECT(
      'id', user.id,
      'name', user.name,
      'avatar', IF(COUNT(avatar.id), 1, NULL)
    ) AS user
  `,
  leftJoinResources: `
    LEFT JOIN resources
      ON resources.id = comment.resourcesId
  `,
  resources: `
    JSON_OBJECT(
      'id', resources.id,
      'title', resources.title
    ) AS resources
  `,
  repliedComment: `
    (
      SELECT
        JSON_OBJECT(
          'id', repliedComment.id,
          'content', repliedComment.content
        )
      FROM
        comment repliedComment
      WHERE
        comment.parentId = repliedComment.id
    ) AS repliedComment
  `,
  totalReplies: `
    (
      SELECT
        COUNT(reply.id)
      FROM
        comment reply
      WHERE
        reply.parentId = comment.id
    ) AS totalReplies
  `,
};
