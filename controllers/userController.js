const User = require('../models/User');

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password -stravaData.accessToken -stravaData.refreshToken')
      .populate('activities');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const updates = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password -stravaData.accessToken -stravaData.refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};