import { Handlers } from "$fresh/server.ts";
import {
  listVerifiedProjects,
  updateVerifiedProject,
  deleteVerifiedProject,
  type VerifiedProject,
} from "../../../../utils/database.ts";

// Simple authentication middleware
function checkAuth(req: Request): boolean {
  const adminPassword = Deno.env.get("ADMIN_PASSWORD");
  
  // If no password is set in env, allow access (for development)
  if (!adminPassword) {
    console.warn("⚠️  ADMIN_PASSWORD not set - admin endpoints are unprotected!");
    return true;
  }

  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  try {
    const base64Credentials = authHeader.slice(6);
    const credentials = atob(base64Credentials);
    const [_username, password] = credentials.split(":");
    
    // Simple check - username can be anything, just check password
    return password === adminPassword;
  } catch {
    return false;
  }
}

function unauthorizedResponse(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin Area"',
    },
  });
}

export const handler: Handlers = {
  // Get all unverified project suggestions
  async GET(req) {
    if (!checkAuth(req)) {
      return unauthorizedResponse();
    }

    try {
      const unverifiedProjects = await listVerifiedProjects("unverified");

      return new Response(
        JSON.stringify({
          success: true,
          projects: unverifiedProjects,
          count: unverifiedProjects.length,
        }),
        {
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        }
      );
    } catch (error) {
      console.error("Error fetching unverified projects:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch projects" }),
        {
          status: 500,
          headers: {
            "content-type": "application/json",
          },
        }
      );
    }
  },

  // Approve or update a project suggestion
  async PATCH(req) {
    if (!checkAuth(req)) {
      return unauthorizedResponse();
    }

    try {
      const body = await req.json();
      const {
        projectId,
        approve,
        updates,
        verifiedBy,
      } = body as {
        projectId: string;
        approve?: boolean;
        updates?: Partial<VerifiedProject>;
        verifiedBy?: string;
      };

      if (!projectId) {
        return new Response(
          JSON.stringify({ error: "Project ID is required" }),
          {
            status: 400,
            headers: {
              "content-type": "application/json",
            },
          }
        );
      }

      const updateData: Partial<VerifiedProject> = updates || {};

      // If approving, set verification fields
      if (approve) {
        updateData.isVerified = true;
        updateData.verifiedAt = Date.now();
        updateData.verifiedBy = verifiedBy || "admin";
      }

      const success = await updateVerifiedProject(projectId, updateData);

      if (!success) {
        return new Response(
          JSON.stringify({ error: "Failed to update project" }),
          {
            status: 500,
            headers: {
              "content-type": "application/json",
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: approve 
            ? "Project approved successfully" 
            : "Project updated successfully",
        }),
        {
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        }
      );
    } catch (error) {
      console.error("Error updating project:", error);
      return new Response(
        JSON.stringify({ error: "Failed to update project" }),
        {
          status: 500,
          headers: {
            "content-type": "application/json",
          },
        }
      );
    }
  },

  // Reject and delete a project suggestion
  async DELETE(req) {
    if (!checkAuth(req)) {
      return unauthorizedResponse();
    }

    try {
      const url = new URL(req.url);
      const projectId = url.searchParams.get("id");

      if (!projectId) {
        return new Response(
          JSON.stringify({ error: "Project ID is required" }),
          {
            status: 400,
            headers: {
              "content-type": "application/json",
            },
          }
        );
      }

      const success = await deleteVerifiedProject(projectId);

      if (!success) {
        return new Response(
          JSON.stringify({ error: "Failed to delete project" }),
          {
            status: 500,
            headers: {
              "content-type": "application/json",
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Project suggestion rejected and deleted",
        }),
        {
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        }
      );
    } catch (error) {
      console.error("Error deleting project:", error);
      return new Response(
        JSON.stringify({ error: "Failed to delete project" }),
        {
          status: 500,
          headers: {
            "content-type": "application/json",
          },
        }
      );
    }
  },
};

