SecureShare.Router.map(function () {
  
  this.resource('file_edit');
  this.resource('file_edit', { path: '/file_edit/:file_edit_id' });
  this.resource('file_edit.edit', { path: '/file_edit/:file_edit_id/edit' });
  
  this.resource('files');
  this.resource('file', { path: '/file/:file_id' });
  this.resource('file.edit', { path: '/file/:file_id/edit' });
  
});
