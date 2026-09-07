import Appeal from "../models/Appeal.js";

export const createAppeal = async (req, res) => {
  try {
    const appeal = new Appeal(req.body);

    const savedAppeal = await appeal.save();

    res.status(201).json(savedAppeal);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};