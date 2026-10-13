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

// Middleware to validate MongoDB ID
function validateId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ID"
    });
  }
  next();
}

// ==========================================
// STUDENT MANAGEMENT VIA FACULTY TAB
// Base Path: /api/faculty/students
// ==========================================

// GET: All students
router.get("/students", async (req, res) => {
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

// GET: Single student by ID
router.get("/students/:id", validateId, async (req, res) => {
  try {
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

// POST: Add student
router.post("/students", async (req, res) => {
  try {
    const { name, email, rollNo, course, semester, facultyId } = req.body;

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

    const populated = await Student.findById(student._id)
      .populate("facultyId", "name email department designation");

    res.status(201).json({
      success: true,
      message: "Student added successfully",
      data: populated
    });
  } catch (error) {
    handleErrors(error, res);
  }
});

// PUT: Update student
router.put("/students/:id", validateId, async (req, res) => {
  try {
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

// DELETE: Remove student
router.delete("/students/:id", validateId, async (req, res) => {
  try {
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

// ==========================================
// FACULTY MANAGEMENT
// Base Path: /api/faculty
// ==========================================

// GET: All faculty
router.get("/", async (req, res) => {
  try {
    const faculty = await Faculty.find();

    res.json({
      success: true,
      count: faculty.length,
      data: faculty
    });
  } catch (error) {
    handleErrors(error, res);
  }
});

// GET: Single faculty member
router.get("/:id", validateId, async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    res.json({
      success: true,
      data: faculty
    });
  } catch (error) {
    handleErrors(error, res);
  }
});

// POST: Add faculty
router.post("/", async (req, res) => {
  try {
    const faculty = await Faculty.create(req.body);

    res.status(201).json({
      success: true,
      message: "Faculty added successfully",
      data: faculty
    });
  } catch (error) {
    handleErrors(error, res);
  }
});

// PUT: Update faculty
router.put("/:id", validateId, async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    res.json({
      success: true,
      message: "Faculty updated successfully",
      data: faculty
    });
  } catch (error) {
    handleErrors(error, res);
  }
});

// DELETE: Remove faculty
router.delete("/:id", validateId, async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndDelete(req.params.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    // Optionally set facultyId to null for students assigned to this deleted faculty
    await Student.updateMany({ facultyId: req.params.id }, { facultyId: null });

    res.json({
      success: true,
      message: "Faculty deleted successfully"
    });
  } catch (error) {
    handleErrors(error, res);
  }
});

module.exports = router;
