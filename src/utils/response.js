function success(res, message, data = null, status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function error(res, message, status = 400, data = null) {
  return res.status(status).json({ success: false, message, data });
}

module.exports = { success, error };


