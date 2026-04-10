import { req } from '../client.js';

export const blogService = {
  // Public (marketing page — no auth)
  getPublicBlogs:      ()      => req('GET',    '/blogs/public', null, false),
  getPublicBlog:       (slug)  => req('GET',    `/blogs/public/${slug}`, null, false),

  // Super admin CRUD
  adminGetBlogs:       ()      => req('GET',    '/blogs'),
  adminGetBlog:        (id)    => req('GET',    `/blogs/${id}`),
  adminCreateBlog:     (data)  => req('POST',   '/blogs', data),
  adminUpdateBlog:     (id, d) => req('PUT',    `/blogs/${id}`, d),
  adminTogglePublish:  (id)    => req('PATCH',  `/blogs/${id}/publish`, {}),
  adminDeleteBlog:     (id)    => req('DELETE', `/blogs/${id}`),
};
