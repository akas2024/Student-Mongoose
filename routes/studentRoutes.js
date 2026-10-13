const express = require("express");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");

const router = express.Router();

// Helper to handle Mongoose errors
function handleErrors(err, res) {
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(400).json({
      success: false,
      message: `${field === "rollNo" ? "Roll number" : field.charAt(0).toUpperCase() + field.slice(1)} already exists`
    });
  }
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(", ")
    });
  }
  return res.status(500).json({
    success: false,
    message: err.message || "Internal server error"
  });
}

// GET /api/students - Retrieve all students
router.get("/", async (req, res) => {
  try {
    const students = await Student.find()
      .populate("facultyId", "name email department designation");

    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    handleErrors(error, res);
  }
});

// GET /api/students/:id - Retrieve a student by ID
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID"
      });
    }

    const student = await Student.findById(req.params.id)
      .populate("facultyId", "name email department designation");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    handleErrors(error, res);
  }
});

// POST /api/students - Create a new student
router.post("/", async (req, res) => {
  try {
    const { name, email, rollNo, course, semester, facultyId } = req.body;

    // Validate facultyId if provided
    if (facultyId) {
      if (!mongoose.isValidObjectId(facultyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid faculty ID"
        });
      }
      const facultyExists = await Faculty.findById(facultyId);
      if (!facultyExists) {
        return res.status(404).json({
          success: false,
          message: "Faculty not found"
        });
      }
    }

    const student = await Student.create({
      name,
      email,
      rollNo,
      course,
      semester,
      facultyId: facultyId || null
    });

    const populatedStudent = await Student.findById(student._id)
      .populate("facultyId", "name email department designation");

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: populatedStudent
    });
  } catch (error) {
    handleErrors(error, res);
  }
});

// PUT /api/students/:id - Update student
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID"
      });
    }

    if (req.body.facultyId) {
      if (!mongoose.isValidObjectId(req.body.facultyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid faculty ID"
        });
      }
      const facultyExists = await Faculty.findById(req.body.facultyId);
      if (!facultyExists) {
        return res.status(404).json({
          success: false,
          message: "Faculty not found"
        });
      }
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate("facultyId", "name email department designation");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.json({
      success: true,
      message: "Student updated successfully",
      data: student
    });
  } catch (error) {
    handleErrors(error, res);
  }
});

// DELETE /api/students/:id - Delete student
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID"
      });
    }

    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.json({
      success: true,
      message: "Student deleted successfully"
    });
  } catch (error) {
    handleErrors(error, res);
  }
});

module.exports = router;
